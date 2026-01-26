import { useState } from 'react';
import { AuthorPreviewDialog } from '../components/AuthorPreviewDialog';
import type { Persona } from '../stores/personas';
import './AuthorPreviewDemo.css';

// Sample authors for demonstration
const SAMPLE_AUTHORS: Persona[] = [
  {
    id: 'author-1',
    account_id: 'demo',
    name: 'Ernest Hemingway',
    description: 'Known for economical, understated prose. Direct sentences, minimal adjectives, and a focus on concrete action and dialogue.',
    avatar_url: '',
    status: 'active',
    is_default: false,
    spending_profile: 'conservative',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: true,
    clone_count: 156,
    use_count: 2340,
  },
  {
    id: 'author-2',
    account_id: 'demo',
    name: 'Jane Austen',
    description: 'Elegant, witty prose with social commentary. Known for ironic observations and nuanced character development.',
    avatar_url: '',
    status: 'active',
    is_default: false,
    spending_profile: 'moderate',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: true,
    clone_count: 203,
    use_count: 3120,
  },
  {
    id: 'author-3',
    account_id: 'demo',
    name: 'Edgar Allan Poe',
    description: 'Dark, atmospheric prose with psychological depth. Master of suspense and gothic imagery.',
    avatar_url: '',
    status: 'active',
    is_default: true,
    spending_profile: 'aggressive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: true,
    clone_count: 89,
    use_count: 1456,
  },
  {
    id: 'author-4',
    account_id: 'demo',
    name: 'Technical Writer',
    description: 'Clear, concise documentation style. Focuses on accuracy, readability, and user-friendly explanations.',
    avatar_url: '',
    status: 'active',
    is_default: false,
    spending_profile: 'custom',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
  },
];

export function AuthorPreviewDemo() {
  const [selectedAuthor, setSelectedAuthor] = useState<Persona | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const handlePreview = (author: Persona) => {
    setSelectedAuthor(author);
  };

  const handleClose = () => {
    setSelectedAuthor(null);
    setIsQuickAdding(false);
  };

  const handleQuickAdd = async () => {
    setIsQuickAdding(true);
    // Simulate adding - in real use this would call the API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsQuickAdding(false);
    handleClose();
  };

  return (
    <div className="author-preview-demo">
      <div className="author-preview-demo-header">
        <h1>AI Author Voice Preview</h1>
        <p className="author-preview-demo-subtitle">
          Preview how an author would rewrite sample text before activating them.
          Click the Preview button on any author card to see their writing style.
        </p>
      </div>

      <div className="author-preview-demo-grid">
        {SAMPLE_AUTHORS.map((author) => (
          <div key={author.id} className="author-demo-card">
            <div className="author-demo-card-header">
              <div className="author-demo-avatar">
                {author.name.charAt(0).toUpperCase()}
              </div>
              <div className="author-demo-info">
                <h3 className="author-demo-name">
                  {author.name}
                  {author.is_default && <span className="demo-badge default">Default</span>}
                  {author.is_public && <span className="demo-badge public">Public</span>}
                </h3>
                <span className="author-demo-style">{author.spending_profile} style</span>
              </div>
            </div>

            {author.description && (
              <p className="author-demo-description">{author.description}</p>
            )}

            <div className="author-demo-stats">
              {author.is_public && (
                <>
                  <div className="author-demo-stat">
                    <span className="stat-label">Clones</span>
                    <span className="stat-value">{author.clone_count}</span>
                  </div>
                  <div className="author-demo-stat">
                    <span className="stat-label">Uses</span>
                    <span className="stat-value">{author.use_count}</span>
                  </div>
                </>
              )}
            </div>

            <div className="author-demo-actions">
              <button
                type="button"
                className="author-demo-preview-btn"
                onClick={() => handlePreview(author)}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Preview Voice
              </button>
              <button type="button" className="author-demo-add-btn">
                Add to My Authors
              </button>
            </div>
          </div>
        ))}
      </div>

      <AuthorPreviewDialog
        isOpen={selectedAuthor !== null}
        onClose={handleClose}
        persona={selectedAuthor}
        showQuickAdd={selectedAuthor?.is_public ?? false}
        onQuickAdd={handleQuickAdd}
        isAddingAuthor={isQuickAdding}
      />
    </div>
  );
}

export default AuthorPreviewDemo;
