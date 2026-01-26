import { Link, useLocation } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import './NotFound.css';

export function NotFound() {
  const location = useLocation();
  const attemptedPath = location.pathname;

  // Suggest related pages based on common path segments
  const getSuggestions = () => {
    const path = attemptedPath.toLowerCase();
    const suggestions = [];

    if (path.includes('transaction')) {
      suggestions.push({ path: '/transactions', label: 'Transactions' });
    }
    if (path.includes('receipt')) {
      suggestions.push({ path: '/receipts', label: 'Receipts' });
    }
    if (path.includes('budget')) {
      suggestions.push({ path: '/budgets', label: 'Budgets' });
    }
    if (path.includes('account')) {
      suggestions.push({ path: '/accounts', label: 'Accounts' });
    }
    if (path.includes('setting')) {
      suggestions.push({ path: '/settings', label: 'Settings' });
    }
    if (path.includes('store')) {
      suggestions.push({ path: '/stores', label: 'Stores' });
    }
    if (path.includes('product')) {
      suggestions.push({ path: '/products', label: 'Products' });
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <PageTransition>
      <div className="not-found-page">
        <div className="not-found-content">
          <div className="not-found-code">404</div>
          <h1 className="not-found-title">Page Not Found</h1>
          <p className="not-found-message">
            Sorry, we couldn't find the page you're looking for. The page at{' '}
            <code className="not-found-path">{attemptedPath}</code> doesn't exist or may have been moved.
          </p>

          <div className="not-found-actions">
            <Link to="/dashboard" className="not-found-home-link">
              Go to Dashboard
            </Link>
          </div>

          {suggestions.length > 0 && (
            <div className="not-found-suggestions">
              <p className="suggestions-label">Were you looking for one of these?</p>
              <div className="suggestions-list">
                {suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.path}
                    to={suggestion.path}
                    className="suggestion-link"
                  >
                    {suggestion.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="not-found-help">
            <p>
              If you believe this is an error, please check the URL or contact support.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
