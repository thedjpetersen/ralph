/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import './Toast.css';

// Types
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Constants
const DEFAULT_DURATION = 4000;
const MAX_VISIBLE_TOASTS = 3;

// Context
const ToastContext = createContext<ToastContextValue | null>(null);

// ID generator
let toastIdCounter = 0;
function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

// Reduced motion hook
function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

// Icons for each variant
const ToastIcons: Record<ToastVariant, ReactNode> = {
  success: (
    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

// Toast Item Component
interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
  prefersReducedMotion: boolean;
}

function ToastItem({ toast, onDismiss, prefersReducedMotion }: ToastItemProps) {
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast.duration > 0) {
      // Start progress animation
      if (progressRef.current && !prefersReducedMotion) {
        progressRef.current.style.animationDuration = `${toast.duration}ms`;
      }

      timerRef.current = window.setTimeout(() => {
        onDismiss();
      }, toast.duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.duration, onDismiss, prefersReducedMotion]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Dismiss if dragged more than 100px horizontally or 50px down
    if (Math.abs(info.offset.x) > 100 || info.offset.y > 50) {
      onDismiss();
    }
  };

  const handleActionClick = () => {
    if (toast.action) {
      toast.action.onClick();
      onDismiss();
    }
  };

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      drag={prefersReducedMotion ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={`ui-toast ui-toast-${toast.variant}`}
      role="alert"
      aria-live="polite"
    >
      <div className="ui-toast-content">
        {ToastIcons[toast.variant]}
        <span className="ui-toast-message">{toast.message}</span>
        {toast.action && (
          <button className="ui-toast-action" onClick={handleActionClick}>
            {toast.action.label}
          </button>
        )}
        <button
          className="ui-toast-close"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {toast.duration > 0 && !prefersReducedMotion && (
        <div className="ui-toast-progress-track">
          <div ref={progressRef} className="ui-toast-progress" />
        </div>
      )}
    </motion.div>
  );
}

// Toast Container Component
function ToastContainerInternal() {
  const context = useContext(ToastContext);
  const prefersReducedMotion = useReducedMotion();

  if (!context) {
    return null;
  }

  const { toasts, removeToast } = context;

  return createPortal(
    <div className="ui-toast-container" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Toast Provider Props
export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

// Toast Provider Component
export function ToastProvider({
  children,
  maxToasts = MAX_VISIBLE_TOASTS,
  defaultDuration = DEFAULT_DURATION,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queueRef = useRef<Toast[]>([]);

  const addToast = useCallback(
    (message: string, options?: ToastOptions): string => {
      const id = generateToastId();
      const toast: Toast = {
        id,
        message,
        variant: options?.variant ?? 'info',
        duration: options?.duration ?? defaultDuration,
        action: options?.action,
      };

      setToasts((currentToasts) => {
        if (currentToasts.length >= maxToasts) {
          // Add to queue if max visible reached
          queueRef.current = [...queueRef.current, toast];
          return currentToasts;
        }
        return [...currentToasts, toast];
      });

      return id;
    },
    [maxToasts, defaultDuration]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) => {
      const newToasts = currentToasts.filter((t) => t.id !== id);

      // If there's space and items in queue, move one from queue to visible
      if (newToasts.length < maxToasts && queueRef.current.length > 0) {
        const [nextToast, ...remainingQueue] = queueRef.current;
        queueRef.current = remainingQueue;
        return [...newToasts, nextToast];
      }

      return newToasts;
    });
  }, [maxToasts]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
    queueRef.current = [];
  }, []);

  const contextValue: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainerInternal />
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

// useToast Hook
export interface UseToastReturn {
  /** Add a toast notification */
  toast: (message: string, options?: ToastOptions) => string;
  /** Add a success toast */
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  /** Add an error toast */
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  /** Add a warning toast */
  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  /** Add an info toast */
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Current list of visible toasts */
  toasts: Toast[];
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { toasts, addToast, removeToast, clearAllToasts } = context;

  return {
    toast: addToast,
    success: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'error' }),
    warning: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'warning' }),
    info: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'info' }),
    dismiss: removeToast,
    dismissAll: clearAllToasts,
    toasts,
  };
}
