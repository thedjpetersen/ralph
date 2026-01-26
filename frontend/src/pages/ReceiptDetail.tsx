import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReceiptsStore, type Receipt, type ReceiptStatus, type ReceiptSourceType, type VLMAnalysisResult, type UpdateReceiptRequest } from '../stores/receipts';
import { useAccountStore } from '../stores/account';
import { useTransactionsStore, type Transaction } from '../stores/transactions';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import './ReceiptDetail.css';

interface EditableFields {
  merchant_name: string;
  merchant_address: string;
  receipt_date: string;
  total_amount: string;
  tax_amount: string;
  subtotal_amount: string;
  payment_method: string;
  receipt_number: string;
  notes: string;
}

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
    updateReceipt,
    linkTransaction,
    unlinkTransaction,
  } = useReceiptsStore();
  const { transactions, fetchTransactions } = useTransactionsStore();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');

  // Image viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState<EditableFields>({
    merchant_name: '',
    merchant_address: '',
    receipt_date: '',
    total_amount: '',
    tax_amount: '',
    subtotal_amount: '',
    payment_method: '',
    receipt_number: '',
    notes: '',
  });

  // Discard changes dialog state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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

  // Initialize editable fields when receipt loads
  useEffect(() => {
    if (receipt) {
      setEditableFields({
        merchant_name: receipt.merchant_name || '',
        merchant_address: receipt.merchant_address || '',
        receipt_date: receipt.receipt_date ? receipt.receipt_date.split('T')[0] : '',
        total_amount: receipt.total_amount !== undefined ? String(receipt.total_amount) : '',
        tax_amount: receipt.tax_amount !== undefined ? String(receipt.tax_amount) : '',
        subtotal_amount: receipt.subtotal_amount !== undefined ? String(receipt.subtotal_amount) : '',
        payment_method: receipt.payment_method || '',
        receipt_number: receipt.receipt_number || '',
        notes: receipt.notes || '',
      });
    }
  }, [receipt]);

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

  // Image viewer handlers
  const handleZoomIn = useCallback(() => {
    setImageZoom((prev) => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  }, []);

  const handleImageWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setImageZoom((prev) => Math.min(prev + 0.1, 4));
    } else {
      setImageZoom((prev) => Math.max(prev - 0.1, 0.5));
    }
  }, []);

  const openImageViewer = useCallback(() => {
    setShowImageViewer(true);
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  }, []);

  const closeImageViewer = useCallback(() => {
    setShowImageViewer(false);
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  }, []);

  // Edit handlers
  const handleEditFieldChange = useCallback(
    (field: keyof EditableFields, value: string) => {
      setEditableFields((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSaveChanges = async () => {
    if (!id || !currentAccount?.id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updateData: UpdateReceiptRequest = {
        merchant_name: editableFields.merchant_name || undefined,
        merchant_address: editableFields.merchant_address || undefined,
        receipt_date: editableFields.receipt_date || undefined,
        total_amount: editableFields.total_amount ? parseFloat(editableFields.total_amount) : undefined,
        tax_amount: editableFields.tax_amount ? parseFloat(editableFields.tax_amount) : undefined,
        subtotal_amount: editableFields.subtotal_amount ? parseFloat(editableFields.subtotal_amount) : undefined,
        payment_method: editableFields.payment_method || undefined,
        receipt_number: editableFields.receipt_number || undefined,
        notes: editableFields.notes || undefined,
      };
      const updated = await updateReceipt(currentAccount.id, id, updateData);
      setReceipt(updated);
      setIsEditing(false);
    } catch {
      setSaveError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!receipt) return false;
    return (
      editableFields.merchant_name !== (receipt.merchant_name || '') ||
      editableFields.merchant_address !== (receipt.merchant_address || '') ||
      editableFields.receipt_date !== (receipt.receipt_date ? receipt.receipt_date.split('T')[0] : '') ||
      editableFields.total_amount !== (receipt.total_amount !== undefined ? String(receipt.total_amount) : '') ||
      editableFields.tax_amount !== (receipt.tax_amount !== undefined ? String(receipt.tax_amount) : '') ||
      editableFields.subtotal_amount !== (receipt.subtotal_amount !== undefined ? String(receipt.subtotal_amount) : '') ||
      editableFields.payment_method !== (receipt.payment_method || '') ||
      editableFields.receipt_number !== (receipt.receipt_number || '') ||
      editableFields.notes !== (receipt.notes || '')
    );
  }, [receipt, editableFields]);

  const handleCancelEditClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditing(false);
      setSaveError(null);
    }
  }, [hasUnsavedChanges]);

  const handleDiscardConfirm = useCallback(() => {
    if (receipt) {
      setEditableFields({
        merchant_name: receipt.merchant_name || '',
        merchant_address: receipt.merchant_address || '',
        receipt_date: receipt.receipt_date ? receipt.receipt_date.split('T')[0] : '',
        total_amount: receipt.total_amount !== undefined ? String(receipt.total_amount) : '',
        tax_amount: receipt.tax_amount !== undefined ? String(receipt.tax_amount) : '',
        subtotal_amount: receipt.subtotal_amount !== undefined ? String(receipt.subtotal_amount) : '',
        payment_method: receipt.payment_method || '',
        receipt_number: receipt.receipt_number || '',
        notes: receipt.notes || '',
      });
    }
    setIsEditing(false);
    setSaveError(null);
    setShowDiscardConfirm(false);
  }, [receipt]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  // Get image URL for the receipt
  const getReceiptImageUrl = useCallback(() => {
    if (!receipt) return null;
    // Check if we have a storage key for the image
    if (receipt.storage_key) {
      // Construct the URL based on storage configuration
      const baseUrl = import.meta.env.VITE_STORAGE_URL || '/api/storage';
      return `${baseUrl}/${receipt.storage_bucket || 'receipts'}/${receipt.storage_key}`;
    }
    // Fallback to file_path if available
    if (receipt.file_path) {
      return receipt.file_path;
    }
    return null;
  }, [receipt]);

  const isImageFile = useCallback(() => {
    if (!receipt) return false;
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    return imageTypes.includes(receipt.mime_type);
  }, [receipt]);

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
        {saveError && <div className="detail-error-message">{saveError}</div>}

        <div className="detail-content">
          <div className="receipt-amount-section">
            <div className="amount-display">
              {formatAmount(receipt.total_amount, receipt.currency)}
            </div>
            <div className="receipt-date">
              {formatDate(receipt.receipt_date)}
            </div>
          </div>

          {/* Receipt Image Viewer Section */}
          {isImageFile() && (
            <div className="detail-section">
              <h2>Receipt Image</h2>
              <div className="receipt-image-preview">
                {getReceiptImageUrl() ? (
                  <div className="image-preview-container">
                    <img
                      src={getReceiptImageUrl() || ''}
                      alt={receipt.file_name}
                      className="receipt-thumbnail"
                      onClick={openImageViewer}
                    />
                    <button
                      className="view-full-image-button"
                      onClick={openImageViewer}
                    >
                      View Full Image
                    </button>
                  </div>
                ) : (
                  <div className="no-image-preview">
                    <p>Image preview not available</p>
                    <span className="no-image-hint">
                      The receipt image may be stored externally or processing is required.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="section-header">
              <h2>Receipt Details</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  Edit
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    onClick={handleCancelEditClick}
                    className="cancel-edit-button"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="edit-form">
                <div className="edit-grid">
                  <div className="edit-field">
                    <label htmlFor="merchant_name">Merchant Name</label>
                    <input
                      type="text"
                      id="merchant_name"
                      value={editableFields.merchant_name}
                      onChange={(e) => handleEditFieldChange('merchant_name', e.target.value)}
                      placeholder="Enter merchant name"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="merchant_address">Address</label>
                    <input
                      type="text"
                      id="merchant_address"
                      value={editableFields.merchant_address}
                      onChange={(e) => handleEditFieldChange('merchant_address', e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="receipt_date">Receipt Date</label>
                    <input
                      type="date"
                      id="receipt_date"
                      value={editableFields.receipt_date}
                      onChange={(e) => handleEditFieldChange('receipt_date', e.target.value)}
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="total_amount">Total Amount</label>
                    <input
                      type="number"
                      id="total_amount"
                      step="0.01"
                      value={editableFields.total_amount}
                      onChange={(e) => handleEditFieldChange('total_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="subtotal_amount">Subtotal</label>
                    <input
                      type="number"
                      id="subtotal_amount"
                      step="0.01"
                      value={editableFields.subtotal_amount}
                      onChange={(e) => handleEditFieldChange('subtotal_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="tax_amount">Tax Amount</label>
                    <input
                      type="number"
                      id="tax_amount"
                      step="0.01"
                      value={editableFields.tax_amount}
                      onChange={(e) => handleEditFieldChange('tax_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="payment_method">Payment Method</label>
                    <input
                      type="text"
                      id="payment_method"
                      value={editableFields.payment_method}
                      onChange={(e) => handleEditFieldChange('payment_method', e.target.value)}
                      placeholder="e.g., Credit Card, Cash"
                    />
                  </div>
                  <div className="edit-field">
                    <label htmlFor="receipt_number">Receipt Number</label>
                    <input
                      type="text"
                      id="receipt_number"
                      value={editableFields.receipt_number}
                      onChange={(e) => handleEditFieldChange('receipt_number', e.target.value)}
                      placeholder="Enter receipt number"
                    />
                  </div>
                </div>
                <div className="edit-field edit-field-full">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={editableFields.notes}
                    onChange={(e) => handleEditFieldChange('notes', e.target.value)}
                    placeholder="Add any notes about this receipt..."
                    rows={3}
                  />
                </div>
              </div>
            ) : (
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
            )}
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

          {receipt.notes && !isEditing && (
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

        {/* Delete receipt confirmation dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Receipt"
          description={`Are you sure you want to delete "${receipt.merchant_name || receipt.file_name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />

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

        {showImageViewer && getReceiptImageUrl() && (
          <div className="image-viewer-overlay" onClick={closeImageViewer}>
            <div className="image-viewer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="image-viewer-controls">
                <button onClick={handleZoomOut} className="zoom-button" title="Zoom Out">
                  -
                </button>
                <span className="zoom-level">{Math.round(imageZoom * 100)}%</span>
                <button onClick={handleZoomIn} className="zoom-button" title="Zoom In">
                  +
                </button>
                <button onClick={handleResetZoom} className="reset-zoom-button" title="Reset Zoom">
                  Reset
                </button>
                <button onClick={closeImageViewer} className="close-viewer-button" title="Close">
                  Close
                </button>
              </div>
              <div className="image-viewer-content" onWheel={handleImageWheel}>
                <img
                  src={getReceiptImageUrl() || ''}
                  alt={receipt.file_name}
                  style={{
                    transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discard changes confirmation dialog */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={handleDiscardCancel}
        onConfirm={handleDiscardConfirm}
        title="Discard Changes"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="danger"
      >
        <p>Any changes you've made to this receipt will be lost.</p>
      </ConfirmDialog>
    </PageTransition>
  );
}
