import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AICommentCard } from '../AICommentCard';
import { useAICommentStore } from '../../stores/aiComments';

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
});
