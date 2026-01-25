import { Link } from 'react-router-dom';
import type { Receipt } from '../../api/client';
import './RecentReceipts.css';

interface RecentReceiptsProps {
  receipts: Receipt[];
  currency?: string;
  isLoading?: boolean;
  limit?: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  processed: 'Processed',
  failed: 'Failed',
  archived: 'Archived',
};

const SOURCE_ICONS: Record<string, string> = {
  email: '@',
  drive: 'D',
  upload: '^',
  scan: 'S',
};

export function RecentReceipts({
  receipts,
  currency = 'USD',
  isLoading,
  limit = 5,
}: RecentReceiptsProps) {
  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const displayReceipts = receipts.slice(0, limit);

  if (isLoading) {
    return (
      <div className="recent-receipts">
        <div className="recent-receipts-header">
          <h3>Recent Receipts</h3>
        </div>
        <div className="receipts-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="receipt-item skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="recent-receipts recent-receipts-empty">
        <div className="recent-receipts-header">
          <h3>Recent Receipts</h3>
        </div>
        <div className="recent-receipts-empty-content">
          <span className="empty-icon">R</span>
          <p>No receipts yet</p>
          <Link to="/receipts/upload" className="upload-receipt-link">
            Upload Receipt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-receipts">
      <div className="recent-receipts-header">
        <h3>Recent Receipts</h3>
        <Link to="/receipts" className="view-all-link">
          View All
        </Link>
      </div>
      <div className="receipts-list">
        {displayReceipts.map((receipt) => (
          <Link
            key={receipt.id}
            to={`/receipts/${receipt.id}`}
            className="receipt-item"
          >
            <div className="receipt-icon">
              <span>{SOURCE_ICONS[receipt.source_type] || 'R'}</span>
            </div>
            <div className="receipt-content">
              <span className="receipt-merchant">
                {receipt.merchant_name || receipt.file_name}
              </span>
              <span className="receipt-meta">
                {formatDate(receipt.receipt_date || receipt.created_at)}
                <span className={`receipt-status status-${receipt.status}`}>
                  {STATUS_LABELS[receipt.status]}
                </span>
              </span>
            </div>
            <span className="receipt-amount">
              {formatAmount(receipt.total_amount)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
