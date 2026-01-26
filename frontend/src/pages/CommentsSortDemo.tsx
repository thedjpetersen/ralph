import { useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { CommentsPanel } from '../components/CommentsPanel';
import { useCommentHighlightStore } from '../stores/commentHighlight';
import './CommentsSortDemo.css';

// Mock comments for demo
const mockComments = [
  {
    id: 'comment-1',
    entityType: 'transaction' as const,
    entityId: 'txn-1',
    text: 'This expense seems higher than usual for this category. Consider reviewing your budget allocation.',
    textRange: { startIndex: 0, endIndex: 50 },
    authorId: 'alice',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'comment-2',
    entityType: 'receipt' as const,
    entityId: 'rcpt-1',
    text: 'Tax deductible expense - remember to include in quarterly filing.',
    textRange: { startIndex: 100, endIndex: 150 },
    authorId: 'bob',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: 'comment-3',
    entityType: 'budget' as const,
    entityId: 'budget-1',
    text: 'Good progress on savings goal this month!',
    textRange: { startIndex: 200, endIndex: 250 },
    authorId: 'alice',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'comment-4',
    entityType: 'transaction' as const,
    entityId: 'txn-2',
    text: 'Recurring subscription - check if still needed.',
    textRange: { startIndex: 50, endIndex: 100 },
    authorId: 'charlie',
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
  },
  {
    id: 'comment-5',
    entityType: 'receipt' as const,
    entityId: 'rcpt-2',
    text: 'Business lunch with client - approved for reimbursement.',
    textRange: { startIndex: 300, endIndex: 350 },
    authorId: 'bob',
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  },
];

export function CommentsSortDemo() {
  const { registerComment, registerTargetElement } = useCommentHighlightStore();

  // Initialize mock comments
  useEffect(() => {
    // Register mock comments
    mockComments.forEach((comment) => {
      registerComment(comment);
    });

    // Register a target element for highlighting
    const textarea = document.getElementById('comments-demo-textarea') as HTMLTextAreaElement;
    if (textarea) {
      registerTargetElement('comments-demo-textarea', textarea);
    }

    return () => {
      // Cleanup is handled by the store
    };
  }, [registerComment, registerTargetElement]);

  return (
    <PageTransition>
      <div className="comments-sort-demo">
        <header className="demo-header">
          <h1>Comments Sorting Demo</h1>
          <p>Sort and filter comments by different criteria</p>
        </header>

        <section className="demo-content">
          <div className="demo-editor">
            <label htmlFor="comments-demo-textarea">Document Content</label>
            <textarea
              id="comments-demo-textarea"
              defaultValue="This is sample document text with multiple comments attached at different positions. The comments panel on the right shows all comments with sorting options. Try changing the sort order to see comments reorder smoothly with animation."
              placeholder="Document content here..."
              rows={10}
              readOnly
            />
          </div>

          <CommentsPanel
            targetElementId="comments-demo-textarea"
            title="Document Comments"
            className="demo-comments-panel"
          />
        </section>

        <section className="demo-instructions">
          <h2>Search & Filter</h2>
          <ul>
            <li><strong>Search:</strong> Type to search comments by text content</li>
            <li><strong>Author Filter:</strong> Multi-select to show comments from specific authors</li>
            <li><strong>Type Filter:</strong> Filter by entity type (transaction, receipt, budget)</li>
            <li><strong>Clear All:</strong> Reset all filters with one click</li>
            <li><strong>Result Count:</strong> Shows filtered count vs total comments</li>
          </ul>
          <h2>Sorting Options</h2>
          <ul>
            <li><strong>Newest:</strong> Most recently created comments first</li>
            <li><strong>Oldest:</strong> Oldest comments first</li>
            <li><strong>Author:</strong> Grouped alphabetically by author name</li>
            <li><strong>Position:</strong> Ordered by document position (start index)</li>
            <li><strong>Type:</strong> Grouped by entity type (budget, receipt, transaction)</li>
          </ul>
          <h2>Features</h2>
          <ul>
            <li>Sort preference persists across sessions (saved to localStorage)</li>
            <li>Visual indicator shows current sort order</li>
            <li>Smooth reorder animation when sort changes</li>
            <li>Hover over a comment to highlight its position</li>
            <li>Click a comment to focus and scroll to it</li>
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
