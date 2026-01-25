import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReceiptsStore, type Receipt, type ReceiptStatus, type ReceiptSourceType, type VLMAnalysisResult } from '../stores/receipts';
import { useAccountStore } from '../stores/account';
import { useTransactionsStore, type Transaction } from '../stores/transactions';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './ReceiptDetail.css';

export function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    currentReceipt,
    receipts,
    isLoading,
    error,
    fetchReceipt,
    deleteReceipt,
    reprocessReceipt,
    linkTransaction,
    unlinkTransaction,
  } = useReceiptsStore();
  const { transactions, fetchTransactions } = useTransactionsStore();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingReceipt = receipts.find((r) => r.id === id);
      if (existingReceipt) {
        setReceipt(existingReceipt);
      } else {
        fetchReceipt(currentAccount.id, id)
          .then((fetched) => {
            setReceipt(fetched);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
      // Fetch transactions for linking
      fetchTransactions(currentAccount.id);
    }
  }, [id, currentAccount?.id, receipts, fetchReceipt, fetchTransactions]);

  // Update local receipt when currentReceipt changes
  useEffect(() => {
    if (currentReceipt && currentReceipt.id === id) {
      setReceipt(currentReceipt);
    }
  }, [currentReceipt, id]);

  const handleDelete = async () => {
    if (!id || !currentAccount?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteReceipt(currentAccount.id, id);
      navigate('/receipts');
    } catch {
      setDeleteError('Failed to delete receipt');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReprocess = async () => {
    if (!id || !currentAccount?.id) return;
    setIsReprocessing(true);
    setReprocessError(null);
    try {
      const updated = await reprocessReceipt(currentAccount.id, id);
      setReceipt(updated);
    } catch {
      setReprocessError('Failed to reprocess receipt');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleLinkTransaction = async () => {
    if (!id || !currentAccount?.id || !selectedTransactionId) return;
    setIsLinking(true);
    setLinkError(null);
    try {
      const updated = await linkTransaction(currentAccount.id, id, selectedTransactionId);
      setReceipt(updated);
      setShowLinkModal(false);
      setSelectedTransactionId('');
    } catch {
      setLinkError('Failed to link transaction');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkTransaction = async () => {
    if (!id || !currentAccount?.id) return;
    setIsLinking(true);
    setLinkError(null);
    try {
      const updated = await unlinkTransaction(currentAccount.id, id);
      setReceipt(updated);
    } catch {
      setLinkError('Failed to unlink transaction');
    } finally {
      setIsLinking(false);
    }
  };

  const getStatusClass = (status: ReceiptStatus) => {
    switch (status) {
      case 'processed':
        return 'status-processed';
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'failed':
        return 'status-failed';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  };

  const getSourceClass = (source: ReceiptSourceType) => {
    switch (source) {
      case 'email':
        return 'source-email';
      case 'drive':
        return 'source-drive';
      case 'upload':
        return 'source-upload';
      case 'scan':
        return 'source-scan';
      default:
        return '';
    }
  };

  const formatAmount = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatConfidence = (confidence: number | undefined) => {
    if (confidence === undefined || confidence === null) return '-';
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const renderVLMAnalysis = (extractedData: VLMAnalysisResult | undefined) => {
    if (!extractedData) {
      return (
        <div className="vlm-empty">
          <p>No VLM analysis data available.</p>
        </div>
      );
    }

    return (
      <div className="vlm-analysis">
        {extractedData.model && (
          <div className="vlm-header">
            <span className="vlm-model">Model: {extractedData.model}</span>
            {extractedData.processed_at && (
              <span className="vlm-date">Processed: {formatDateTime(extractedData.processed_at)}</span>
            )}
            {extractedData.confidence !== undefined && (
              <span className="vlm-confidence">Confidence: {formatConfidence(extractedData.confidence)}</span>
            )}
          </div>
        )}

        {extractedData.extracted_fields && (
          <div className="vlm-fields">
            <h4>Extracted Fields</h4>
            <div className="vlm-fields-grid">
              {extractedData.extracted_fields.merchant_name && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Merchant</span>
                  <span className="vlm-field-value">{extractedData.extracted_fields.merchant_name}</span>
                </div>
              )}
              {extractedData.extracted_fields.merchant_address && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Address</span>
                  <span className="vlm-field-value">{extractedData.extracted_fields.merchant_address}</span>
                </div>
              )}
              {extractedData.extracted_fields.receipt_date && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Date</span>
                  <span className="vlm-field-value">{extractedData.extracted_fields.receipt_date}</span>
                </div>
              )}
              {extractedData.extracted_fields.total_amount !== undefined && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Total</span>
                  <span className="vlm-field-value">${extractedData.extracted_fields.total_amount.toFixed(2)}</span>
                </div>
              )}
              {extractedData.extracted_fields.tax_amount !== undefined && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Tax</span>
                  <span className="vlm-field-value">${extractedData.extracted_fields.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {extractedData.extracted_fields.subtotal_amount !== undefined && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Subtotal</span>
                  <span className="vlm-field-value">${extractedData.extracted_fields.subtotal_amount.toFixed(2)}</span>
                </div>
              )}
              {extractedData.extracted_fields.payment_method && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Payment</span>
                  <span className="vlm-field-value">{extractedData.extracted_fields.payment_method}</span>
                </div>
              )}
              {extractedData.extracted_fields.receipt_number && (
                <div className="vlm-field">
                  <span className="vlm-field-label">Receipt #</span>
                  <span className="vlm-field-value">{extractedData.extracted_fields.receipt_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {extractedData.extracted_fields?.line_items && extractedData.extracted_fields.line_items.length > 0 && (
          <div className="vlm-line-items">
            <h4>Extracted Line Items</h4>
            <div className="vlm-line-items-list">
              {extractedData.extracted_fields.line_items.map((item: { description: string; quantity?: number; unit_price?: number; total_price?: number }, index: number) => (
                <div key={index} className="vlm-line-item">
                  <span className="vlm-line-item-desc">{item.description}</span>
                  <span className="vlm-line-item-qty">
                    {item.quantity !== undefined ? `x${item.quantity}` : ''}
                  </span>
                  <span className="vlm-line-item-price">
                    {item.total_price !== undefined ? `$${item.total_price.toFixed(2)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {extractedData.raw_text && (
          <div className="vlm-raw-text">
            <h4>Raw OCR Text</h4>
            <pre className="vlm-raw-text-content">{extractedData.raw_text}</pre>
          </div>
        )}

        {extractedData.errors && extractedData.errors.length > 0 && (
          <div className="vlm-errors">
            <h4>Processing Errors</h4>
            <ul>
              {extractedData.errors.map((err: string, index: number) => (
                <li key={index} className="vlm-error-item">{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="receipt-detail-page">
          <div className="detail-error">
            <h2>No Account Selected</h2>
            <p>Please select an account to view receipt details.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !receipt) {
    return (
      <PageTransition>
        <div className="receipt-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !receipt) {
    return (
      <PageTransition>
        <div className="receipt-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/receipts')} className="back-button">
              Back to Receipts
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!receipt) {
    return (
      <PageTransition>
        <div className="receipt-detail-page">
          <div className="detail-error">
            <h2>Receipt Not Found</h2>
            <p>The receipt you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/receipts')} className="back-button">
              Back to Receipts
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="receipt-detail-page">
        <div className="detail-header">
          <Link to="/receipts" className="back-link">
            &larr; Back to Receipts
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              <div>
                <h1>{receipt.merchant_name || receipt.file_name}</h1>
                <div className="detail-meta">
                  <span className={`receipt-status ${getStatusClass(receipt.status)}`}>
                    {receipt.status}
                  </span>
                  <span className={`receipt-source ${getSourceClass(receipt.source_type)}`}>
                    {receipt.source_type}
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-actions">
              {receipt.status === 'failed' && (
                <button
                  onClick={handleReprocess}
                  className="reprocess-button"
                  disabled={isReprocessing}
                >
                  {isReprocessing ? 'Reprocessing...' : 'Retry Processing'}
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-button"
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {deleteError && <div className="detail-error-message">{deleteError}</div>}
        {reprocessError && <div className="detail-error-message">{reprocessError}</div>}
        {linkError && <div className="detail-error-message">{linkError}</div>}

        <div className="detail-content">
          <div className="receipt-amount-section">
            <div className="amount-display">
              {formatAmount(receipt.total_amount, receipt.currency)}
            </div>
            <div className="receipt-date">
              {formatDate(receipt.receipt_date)}
            </div>
          </div>

          <div className="detail-section">
            <h2>Receipt Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">File Name</span>
                <span className="detail-value">{receipt.file_name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">File Type</span>
                <span className="detail-value">{receipt.mime_type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">File Size</span>
                <span className="detail-value">{formatFileSize(receipt.file_size)}</span>
              </div>
              {receipt.merchant_name && (
                <div className="detail-item">
                  <span className="detail-label">Merchant</span>
                  <span className="detail-value">{receipt.merchant_name}</span>
                </div>
              )}
              {receipt.merchant_address && (
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{receipt.merchant_address}</span>
                </div>
              )}
              {receipt.payment_method && (
                <div className="detail-item">
                  <span className="detail-label">Payment Method</span>
                  <span className="detail-value">{receipt.payment_method}</span>
                </div>
              )}
              {receipt.receipt_number && (
                <div className="detail-item">
                  <span className="detail-label">Receipt Number</span>
                  <span className="detail-value">{receipt.receipt_number}</span>
                </div>
              )}
              {receipt.subtotal_amount !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Subtotal</span>
                  <span className="detail-value">{formatAmount(receipt.subtotal_amount, receipt.currency)}</span>
                </div>
              )}
              {receipt.tax_amount !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Tax</span>
                  <span className="detail-value">{formatAmount(receipt.tax_amount, receipt.currency)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="section-header">
              <h2>Linked Transaction</h2>
              {!receipt.transaction_id && (
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="link-button"
                  disabled={isLinking}
                >
                  Link Transaction
                </button>
              )}
            </div>
            {receipt.transaction_id ? (
              <div className="linked-transaction">
                <Link to={`/transactions/${receipt.transaction_id}`} className="transaction-link">
                  View Linked Transaction
                </Link>
                <button
                  onClick={handleUnlinkTransaction}
                  className="unlink-button"
                  disabled={isLinking}
                >
                  {isLinking ? 'Unlinking...' : 'Unlink'}
                </button>
              </div>
            ) : (
              <p className="no-transaction">No transaction linked to this receipt.</p>
            )}
          </div>

          <div className="detail-section">
            <h2>VLM Analysis Results</h2>
            {receipt.ocr_completed ? (
              <>
                {receipt.ocr_confidence !== undefined && (
                  <div className="ocr-confidence">
                    OCR Confidence: {formatConfidence(receipt.ocr_confidence)}
                  </div>
                )}
                {renderVLMAnalysis(receipt.extracted_data)}
              </>
            ) : (
              <div className="vlm-empty">
                <p>
                  {receipt.status === 'pending' || receipt.status === 'processing'
                    ? 'Receipt is still being processed...'
                    : 'No OCR analysis has been performed yet.'}
                </p>
                {receipt.status === 'failed' && (
                  <button
                    onClick={handleReprocess}
                    className="reprocess-button-inline"
                    disabled={isReprocessing}
                  >
                    {isReprocessing ? 'Reprocessing...' : 'Retry Processing'}
                  </button>
                )}
              </div>
            )}
          </div>

          {receipt.ocr_text && (
            <div className="detail-section">
              <h2>OCR Text</h2>
              <pre className="ocr-text">{receipt.ocr_text}</pre>
            </div>
          )}

          {receipt.category_tags && receipt.category_tags.length > 0 && (
            <div className="detail-section">
              <h2>Tags</h2>
              <div className="detail-list">
                {receipt.category_tags.map((tag, index) => (
                  <span key={index} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {receipt.notes && (
            <div className="detail-section">
              <h2>Notes</h2>
              <p className="detail-notes">{receipt.notes}</p>
            </div>
          )}

          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {formatDateTime(receipt.created_at)}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {formatDateTime(receipt.updated_at)}
              </span>
            </div>
            {receipt.processed_at && (
              <div className="timestamp-item">
                <span className="detail-label">Processed</span>
                <span className="detail-value">
                  {formatDateTime(receipt.processed_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Receipt</h3>
              <p>
                Are you sure you want to delete this receipt{' '}
                <strong>{receipt.merchant_name || receipt.file_name}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-button"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="confirm-delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Receipt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLinkModal && (
          <div className="link-modal-overlay" onClick={() => setShowLinkModal(false)}>
            <div className="link-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Link Transaction</h3>
              <p>Select a transaction to link to this receipt:</p>
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                className="transaction-select"
              >
                <option value="">Select a transaction...</option>
                {transactions.map((transaction: Transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {transaction.merchant_name || 'Unknown'} - {formatAmount(transaction.amount, transaction.currency)} ({formatDate(transaction.transaction_date)})
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setSelectedTransactionId('');
                  }}
                  className="cancel-button"
                  disabled={isLinking}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkTransaction}
                  className="confirm-link-button"
                  disabled={isLinking || !selectedTransactionId}
                >
                  {isLinking ? 'Linking...' : 'Link Transaction'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
