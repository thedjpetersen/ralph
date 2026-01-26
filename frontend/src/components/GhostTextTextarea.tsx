import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type TextareaHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent,
  type DragEvent,
  type ClipboardEvent,
} from 'react';
import { useAISuggestionStore, useAISuggestion } from '../stores/aiSuggestions';
import { useSmartTypographyStore } from '../stores/smartTypography';
import { useParagraphFocusStore } from '../stores/paragraphFocus';
import { useTypewriterScrollStore } from '../stores/typewriterScroll';
import { useImageUploadStore, validateImageFile, isImageFile } from '../stores/imageUpload';
import { toast } from '../stores/toast';
import './GhostTextTextarea.css';

export interface GhostTextTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** Unique identifier for this field's suggestions */
  fieldId: string;
  /** Current value of the textarea */
  value: string;
  /** Called when the value changes (either by typing or accepting suggestions) */
  onChange: (value: string) => void;
  /** Additional context to send with suggestion requests */
  context?: Record<string, unknown>;
  /** Debounce delay in ms before fetching suggestions (default: 500) */
  debounceMs?: number;
  /** Whether AI suggestions are enabled (default: true) */
  enableSuggestions?: boolean;
  /** Whether smart typography is enabled (default: true) */
  enableSmartTypography?: boolean;
  /** Whether image drag-and-drop is enabled (default: true) */
  enableImageUpload?: boolean;
  /** Callback when an image is uploaded - receives the image URL and alt text */
  onImageUpload?: (imageUrl: string, altText: string) => void;
}

export function GhostTextTextarea({
  fieldId,
  value,
  onChange,
  context,
  debounceMs = 500,
  enableSuggestions = true,
  enableSmartTypography = true,
  enableImageUpload = true,
  onImageUpload,
  className = '',
  onKeyDown,
  ...props
}: GhostTextTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef(value);
  const skipTypographyRef = useRef(false);
  const dragCounterRef = useRef(0);

  // Local state for drag-over indicator
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const suggestion = useAISuggestion(fieldId);
  const { fetchSuggestion, fetchContinueWriting, dismissSuggestion, acceptSuggestion, acceptPartialSuggestion } =
    useAISuggestionStore();
  const smartTypography = useSmartTypographyStore();
  const { setTargetElement: setParagraphFocusTarget } = useParagraphFocusStore();
  const { setTargetElement: setTypewriterScrollTarget } = useTypewriterScrollStore();
  const { addUpload, updateUploadProgress, setUploadComplete, setUploadError } = useImageUploadStore();

  // Register textarea with paragraph focus and typewriter scroll stores when mounted/focused
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      setParagraphFocusTarget(textarea);
      setTypewriterScrollTarget(textarea);
    };

    const handleBlur = () => {
      // Only clear if this textarea was the target
      const currentParagraphTarget = useParagraphFocusStore.getState().targetElement;
      const currentTypewriterTarget = useTypewriterScrollStore.getState().targetElement;

      if (currentParagraphTarget === textarea || currentTypewriterTarget === textarea) {
        // Don't clear immediately - allow time for focus to transfer
        setTimeout(() => {
          const stillFocused = document.activeElement === textarea;
          if (!stillFocused) {
            const newParagraphTarget = useParagraphFocusStore.getState().targetElement;
            const newTypewriterTarget = useTypewriterScrollStore.getState().targetElement;
            if (newParagraphTarget === textarea) {
              // Keep the target if no new one was set
              // This allows the overlay to persist when clicking elsewhere
            }
            if (newTypewriterTarget === textarea) {
              // Keep the target if no new one was set
            }
          }
        }, 100);
      }
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);

    // Set as target if already focused
    if (document.activeElement === textarea) {
      setParagraphFocusTarget(textarea);
      setTypewriterScrollTarget(textarea);
    }

    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
    };
  }, [setParagraphFocusTarget, setTypewriterScrollTarget]);

  // Debounced fetch suggestion
  const debouncedFetchSuggestion = useCallback(
    (currentValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (enableSuggestions && currentValue.trim()) {
          fetchSuggestion(fieldId, currentValue, context);
        }
      }, debounceMs);
    },
    [fieldId, context, debounceMs, enableSuggestions, fetchSuggestion]
  );

  // Handle value changes
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;

      // Apply smart typography if enabled (and not skipped due to undo)
      if (enableSmartTypography && smartTypography.isEnabled && !skipTypographyRef.current) {
        const result = smartTypography.processInput(newValue, cursorPosition);
        if (result) {
          newValue = result.text;
          // Update the textarea value and cursor position
          e.target.value = newValue;
          e.target.setSelectionRange(result.cursorPosition, result.cursorPosition);
        } else {
          // Update previous text even if no transformation occurred
          smartTypography.setPreviousText(newValue);
        }
      } else {
        // Update previous text tracking
        smartTypography.setPreviousText(newValue);
        skipTypographyRef.current = false;
      }

      onChange(newValue);

      // Dismiss existing suggestion when typing continues
      if (suggestion && !suggestion.isLoading) {
        dismissSuggestion(fieldId);
      }

      // Trigger new suggestion fetch
      debouncedFetchSuggestion(newValue);
    },
    [onChange, suggestion, fieldId, dismissSuggestion, debouncedFetchSuggestion, enableSmartTypography, smartTypography]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Call original onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
        if (e.defaultPrevented) return;
      }

      // Cmd/Ctrl + Z: Undo typography transformation (if available)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (enableSmartTypography && smartTypography.canUndo()) {
          e.preventDefault();
          const undoEntry = smartTypography.undo();
          if (undoEntry) {
            // Skip typography processing for this undo
            skipTypographyRef.current = true;
            onChange(undoEntry.originalText);
            // Restore cursor position after React updates
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.setSelectionRange(
                  undoEntry.originalCursorPosition,
                  undoEntry.originalCursorPosition
                );
              }
            });
          }
          return;
        }
        // If no typography undo, let browser handle native undo
      }

      // Cmd/Ctrl + Shift + Enter: Trigger AI continue writing
      // This works even without an existing suggestion
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (enableSuggestions && value.trim()) {
          fetchContinueWriting(fieldId, value, context);
        }
        return;
      }

      // Only handle suggestion-related shortcuts if we have a suggestion
      if (!suggestion?.text || suggestion.isLoading) {
        return;
      }

      // Tab: Accept full suggestion
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const acceptedText = acceptSuggestion(fieldId);
        if (acceptedText) {
          onChange(value + acceptedText);
        }
        return;
      }

      // Cmd/Ctrl + Right Arrow: Accept word by word
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const acceptedPart = acceptPartialSuggestion(fieldId, 1);
        if (acceptedPart) {
          onChange(value + acceptedPart);
        }
        return;
      }

      // Escape: Dismiss suggestion
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissSuggestion(fieldId);
        return;
      }
    },
    [
      onKeyDown,
      suggestion,
      fieldId,
      acceptSuggestion,
      acceptPartialSuggestion,
      dismissSuggestion,
      onChange,
      value,
      enableSuggestions,
      enableSmartTypography,
      fetchContinueWriting,
      context,
      smartTypography,
    ]
  );

  // Image upload handler
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!enableImageUpload) return;

      // Validate the file
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      // Add to upload store and start upload
      const uploadId = addUpload(file);
      setIsUploading(true);
      setUploadProgress(0);

      // Show uploading toast
      const toastId = toast.info(`Uploading ${file.name}...`, { duration: 0 });

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const next = Math.min(prev + Math.random() * 20 + 5, 90);
            updateUploadProgress(uploadId, next);
            return next;
          });
        }, 200);

        // Simulate upload delay (1-2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

        clearInterval(progressInterval);
        setUploadProgress(100);
        updateUploadProgress(uploadId, 100);

        // Create a blob URL for the uploaded image
        const imageUrl = URL.createObjectURL(file);
        const altText = file.name.replace(/\.[^/.]+$/, '');

        // Mark upload as complete
        setUploadComplete(uploadId, imageUrl);

        // Dismiss uploading toast and show success
        toast.dismiss(toastId);
        toast.success('Image uploaded successfully');

        // Insert image markdown at cursor position or call callback
        if (onImageUpload) {
          onImageUpload(imageUrl, altText);
        } else {
          // Default behavior: insert markdown at cursor
          const textarea = textareaRef.current;
          if (textarea) {
            const cursorPos = textarea.selectionStart;
            const textBefore = value.substring(0, cursorPos);
            const textAfter = value.substring(cursorPos);
            const imageMarkdown = `![${altText}](${imageUrl})`;
            const newValue = textBefore + imageMarkdown + textAfter;
            onChange(newValue);

            // Position cursor after the inserted image
            requestAnimationFrame(() => {
              const newPos = cursorPos + imageMarkdown.length;
              textarea.setSelectionRange(newPos, newPos);
              textarea.focus();
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadError(uploadId, errorMessage);
        toast.dismiss(toastId);
        toast.error(`Failed to upload image: ${errorMessage}`);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [
      enableImageUpload,
      addUpload,
      updateUploadProgress,
      setUploadComplete,
      setUploadError,
      onImageUpload,
      onChange,
      value,
    ]
  );

  // Process files for image uploads
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter(isImageFile);

      if (imageFiles.length === 0) {
        toast.warning('No valid image files found');
        return;
      }

      // Upload each image
      imageFiles.forEach((file) => handleImageUpload(file));
    },
    [handleImageUpload]
  );

  // Drag event handlers
  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enableImageUpload) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        // Check if any item is an image
        const hasImage = Array.from(e.dataTransfer.items).some(
          (item) => item.kind === 'file' && item.type.startsWith('image/')
        );
        if (hasImage) {
          setIsDragOver(true);
        }
      }
    },
    [enableImageUpload]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enableImageUpload) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;

      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
      }
    },
    [enableImageUpload]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enableImageUpload) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    },
    [enableImageUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enableImageUpload) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [enableImageUpload, processFiles]
  );

  // Paste handler for clipboard images
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!enableImageUpload) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Check for images in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
          }
          return;
        }
      }
    },
    [enableImageUpload, handleImageUpload]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      dismissSuggestion(fieldId);
    };
  }, [fieldId, dismissSuggestion]);

  // Dismiss suggestion when value changes externally (not from accepting)
  useEffect(() => {
    if (value !== previousValueRef.current) {
      // Only dismiss if the change wasn't from accepting a suggestion
      const currentSuggestion = useAISuggestionStore.getState().suggestions.get(fieldId);
      if (currentSuggestion && !currentSuggestion.isLoading) {
        // Check if the new value ends with the previous value (meaning we accepted something)
        const wasAccepted = value.startsWith(previousValueRef.current);
        if (!wasAccepted) {
          dismissSuggestion(fieldId);
        }
      }
    }
    previousValueRef.current = value;
  }, [value, fieldId, dismissSuggestion]);

  const showGhostText = suggestion?.text && !suggestion.isLoading;

  return (
    <div
      ref={containerRef}
      className={`ghost-text-container ${isDragOver ? 'ghost-text-drag-over' : ''} ${isUploading ? 'ghost-text-uploading' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden div to mirror content for ghost text positioning */}
      <div className="ghost-text-mirror" aria-hidden="true">
        <span className="ghost-text-value">{value}</span>
        {showGhostText && (
          <span className="ghost-text-suggestion" data-testid="ghost-text-suggestion">
            {suggestion.text}
          </span>
        )}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`ghost-text-textarea ${className}`}
        aria-describedby={showGhostText ? `${fieldId}-suggestion-hint` : undefined}
        {...props}
      />

      {/* Screen reader hint for suggestion */}
      {showGhostText && (
        <div id={`${fieldId}-suggestion-hint`} className="ghost-text-sr-hint" role="status">
          AI suggestion available: "{suggestion.text}". Press Tab to accept all, Cmd+Right for one
          word, or Escape to dismiss.
        </div>
      )}

      {/* Loading indicator */}
      {suggestion?.isLoading && (
        <div className="ghost-text-loading" aria-hidden="true">
          <span className="ghost-text-dot"></span>
          <span className="ghost-text-dot"></span>
          <span className="ghost-text-dot"></span>
        </div>
      )}

      {/* Drag-over indicator overlay */}
      {isDragOver && enableImageUpload && (
        <div className="ghost-text-drag-overlay" aria-hidden="true">
          <div className="ghost-text-drag-content">
            <svg
              className="ghost-text-drag-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="ghost-text-drag-text">Drop image here</span>
          </div>
        </div>
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="ghost-text-upload-overlay" aria-live="polite">
          <div className="ghost-text-upload-content">
            <div className="ghost-text-upload-spinner" />
            <span className="ghost-text-upload-text">Uploading image...</span>
            <div className="ghost-text-upload-progress-bar">
              <div
                className="ghost-text-upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

GhostTextTextarea.displayName = 'GhostTextTextarea';
