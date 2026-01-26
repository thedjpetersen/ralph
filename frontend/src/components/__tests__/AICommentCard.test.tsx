import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AICommentCard } from '../AICommentCard';
import { useAICommentStore } from '../../stores/aiComments';
import { useCommentHighlightStore } from '../../stores/commentHighlight';
import { useToastStore } from '../../stores/toast';

// Mock matchMedia for reduced motion detection
const mockMatchMedia = (prefersReducedMotion: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('AICommentCard', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAICommentStore.setState({
      comments: new Map(),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: null,
    });
    useCommentHighlightStore.setState({
      commentRanges: new Map(),
      activeHighlight: null,
      focusedCommentId: null,
      targetElements: new Map(),
    });
    useToastStore.setState({
      toasts: [],
      queue: [],
    });
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders generate button when no comment exists', () => {
    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByText('Get AI Insight')).toBeInTheDocument();
  });

  it('has accessible aria-label on generate button', () => {
    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByLabelText('Generate AI insight')).toBeInTheDocument();
  });

  it('renders comment card when comment exists', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'This is an AI insight about your transaction.',
            isStreaming: false,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByText('This is an AI insight about your transaction.')).toBeInTheDocument();
    expect(screen.getByText('AI Insight')).toBeInTheDocument();
  });

  it('shows cancel button while streaming', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Partial text...',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: 'Partial text...',
      abortController: new AbortController(),
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByLabelText('Cancel generation')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows cursor while streaming', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Streaming text',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: 'Streaming text',
      abortController: new AbortController(),
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const cursor = document.querySelector('.ai-cursor');
    expect(cursor).toBeInTheDocument();
  });

  it('shows streaming indicator dots while streaming', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Text',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: 'Text',
      abortController: new AbortController(),
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const dots = document.querySelectorAll('.streaming-dot');
    expect(dots).toHaveLength(3);
  });

  it('shows regenerate and clear buttons when not streaming', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Complete text',
            isStreaming: false,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('clears comment when clear button is clicked', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'To be cleared',
            isStreaming: false,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const clearButton = screen.getByLabelText('Clear insight');
    fireEvent.click(clearButton);

    expect(useAICommentStore.getState().comments.has('test-123')).toBe(false);
  });

  it('cancels stream when cancel button is clicked', () => {
    const abortController = new AbortController();
    const abortSpy = vi.spyOn(abortController, 'abort');

    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Streaming...',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: 'Streaming...',
      abortController,
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const cancelButton = screen.getByLabelText('Cancel generation');
    fireEvent.click(cancelButton);

    expect(abortSpy).toHaveBeenCalled();
  });

  it('shows error state when error occurs', () => {
    useAICommentStore.setState({
      comments: new Map(),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: 'Failed to generate AI comment',
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByText('Failed to generate AI comment')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('has proper aria attributes for accessibility', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Accessible comment',
            isStreaming: false,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: null,
      streamingText: '',
      abortController: null,
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const card = screen.getByRole('region', { name: 'AI-generated insight' });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('aria-live', 'polite');
    expect(card).toHaveAttribute('aria-busy', 'false');
  });

  it('sets aria-busy to true while streaming', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: 'Streaming...',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: 'Streaming...',
      abortController: new AbortController(),
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    const card = screen.getByRole('region', { name: 'AI-generated insight' });
    expect(card).toHaveAttribute('aria-busy', 'true');
  });

  it('shows thinking state when streaming with no text yet', () => {
    useAICommentStore.setState({
      comments: new Map([
        [
          'test-123',
          {
            id: 'comment-1',
            entityType: 'transaction',
            entityId: 'test-123',
            text: '',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          },
        ],
      ]),
      activeStreamId: 'comment-1',
      streamingText: '',
      abortController: new AbortController(),
      error: null,
    });

    render(<AICommentCard entityType="transaction" entityId="test-123" />);
    expect(screen.getByLabelText('Generating insight')).toBeInTheDocument();
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  describe('Reduced Motion', () => {
    it('respects reduced motion preferences for cursor', () => {
      mockMatchMedia(true);
      useAICommentStore.setState({
        comments: new Map([
          [
            'test-123',
            {
              id: 'comment-1',
              entityType: 'transaction',
              entityId: 'test-123',
              text: 'Streaming',
              isStreaming: true,
              createdAt: new Date().toISOString(),
            },
          ],
        ]),
        activeStreamId: 'comment-1',
        streamingText: 'Streaming',
        abortController: new AbortController(),
        error: null,
      });

      render(<AICommentCard entityType="transaction" entityId="test-123" />);
      const cursor = document.querySelector('.ai-cursor');
      expect(cursor).toHaveClass('no-animation');
    });
  });

  describe('Accept Suggestion', () => {
    it('shows Accept button when comment has a suggestion with target element and text range', () => {
      // Create a mock textarea element
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = 'Hello world, this is some text.';
      // "some text" starts at index 21 and ends at index 30

      // Register the target element in the highlight store
      useCommentHighlightStore.setState({
        targetElements: new Map([['test-target', mockTextarea]]),
        commentRanges: new Map(),
        activeHighlight: null,
        focusedCommentId: null,
      });

      useAICommentStore.setState({
        comments: new Map([
          [
            'test-123',
            {
              id: 'comment-1',
              entityType: 'transaction',
              entityId: 'test-123',
              text: 'Consider changing "some text" to "better text"',
              isStreaming: false,
              createdAt: new Date().toISOString(),
              suggestion: {
                originalText: 'some text',
                suggestedText: 'better text',
              },
            },
          ],
        ]),
        activeStreamId: null,
        streamingText: '',
        abortController: null,
        error: null,
      });

      render(
        <AICommentCard
          entityType="transaction"
          entityId="test-123"
          targetElementId="test-target"
          textRange={{ startIndex: 21, endIndex: 30 }}
        />
      );

      expect(screen.getByLabelText('Accept suggestion')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });

    it('does not show Accept button when comment has no suggestion', () => {
      useAICommentStore.setState({
        comments: new Map([
          [
            'test-123',
            {
              id: 'comment-1',
              entityType: 'transaction',
              entityId: 'test-123',
              text: 'Just a regular comment',
              isStreaming: false,
              createdAt: new Date().toISOString(),
            },
          ],
        ]),
        activeStreamId: null,
        streamingText: '',
        abortController: null,
        error: null,
      });

      render(<AICommentCard entityType="transaction" entityId="test-123" />);

      expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    });

    it('replaces text and shows toast when Accept is clicked', () => {
      // Create a mock textarea element
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = 'Hello world, this is some text.';
      // "some text" starts at index 21 and ends at index 30

      // Register the target element in the highlight store
      useCommentHighlightStore.setState({
        targetElements: new Map([['test-target', mockTextarea]]),
        commentRanges: new Map(),
        activeHighlight: null,
        focusedCommentId: null,
      });

      useAICommentStore.setState({
        comments: new Map([
          [
            'test-123',
            {
              id: 'comment-1',
              entityType: 'transaction',
              entityId: 'test-123',
              text: 'Consider changing "some text" to "better text"',
              isStreaming: false,
              createdAt: new Date().toISOString(),
              suggestion: {
                originalText: 'some text',
                suggestedText: 'better text',
              },
            },
          ],
        ]),
        activeStreamId: null,
        streamingText: '',
        abortController: null,
        error: null,
      });

      render(
        <AICommentCard
          entityType="transaction"
          entityId="test-123"
          targetElementId="test-target"
          textRange={{ startIndex: 21, endIndex: 30 }}
        />
      );

      const acceptButton = screen.getByLabelText('Accept suggestion');
      fireEvent.click(acceptButton);

      // Check that the text was replaced
      expect(mockTextarea.value).toBe('Hello world, this is better text.');

      // Check that the comment was resolved (removed)
      expect(useAICommentStore.getState().comments.has('test-123')).toBe(false);

      // Check that a success toast was shown
      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Suggestion applied');
      expect(toasts[0].type).toBe('success');
    });
  });
});
