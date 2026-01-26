import { useState, useCallback } from 'react';
import { useTransactionsStore, type LineItem, type CreateLineItemRequest } from '../stores/transactions';
import { DraggableList, type DraggableItem } from './ui';
import './LineItemList.css';

interface LineItemListProps {
  accountId: string;
  transactionId: string;
  lineItems: LineItem[];
  currency: string;
}

interface NewLineItemForm {
  description: string;
  quantity: string;
  unit_price: string;
  sku: string;
  category: string;
}

const initialFormState: NewLineItemForm = {
  description: '',
  quantity: '1',
  unit_price: '',
  sku: '',
  category: '',
};

export function LineItemList({ accountId, transactionId, lineItems, currency }: LineItemListProps) {
  const { addLineItem, updateLineItem, deleteLineItem, reorderLineItems, isLoading } = useTransactionsStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewLineItemForm>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewLineItemForm>(initialFormState);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    },
    [currency]
  );

  const handleNewItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItemForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleEditItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.description || !newItemForm.unit_price) {
      setError('Description and unit price are required');
      return;
    }

    try {
      const quantity = parseFloat(newItemForm.quantity) || 1;
      const unitPrice = parseFloat(newItemForm.unit_price) || 0;

      const data: Omit<CreateLineItemRequest, 'receipt_id'> = {
        description: newItemForm.description,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
        sku: newItemForm.sku || undefined,
        category: newItemForm.category || undefined,
      };

      await addLineItem(accountId, transactionId, data);
      setNewItemForm(initialFormState);
      setShowAddForm(false);
      setError(null);
    } catch {
      setError('Failed to add line item');
    }
  };

  const startEditing = useCallback((item: LineItem) => {
    setEditingId(item.id);
    setEditForm({
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      sku: item.sku || '',
      category: item.category || '',
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditForm(initialFormState);
    setError(null);
  }, []);

  const handleUpdateItem = useCallback(
    async (id: string) => {
      if (!editForm.description || !editForm.unit_price) {
        setError('Description and unit price are required');
        return;
      }

      try {
        const quantity = parseFloat(editForm.quantity) || 1;
        const unitPrice = parseFloat(editForm.unit_price) || 0;

        await updateLineItem(accountId, transactionId, id, {
          description: editForm.description,
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          sku: editForm.sku || undefined,
          category: editForm.category || undefined,
        });

        setEditingId(null);
        setEditForm(initialFormState);
        setError(null);
      } catch {
        setError('Failed to update line item');
      }
    },
    [accountId, transactionId, editForm, updateLineItem]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this line item?')) {
        return;
      }

      try {
        await deleteLineItem(accountId, transactionId, id);
        setError(null);
      } catch {
        setError('Failed to delete line item');
      }
    },
    [accountId, transactionId, deleteLineItem]
  );

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleReorder = useCallback(
    (reorderedItems: (LineItem & DraggableItem)[]) => {
      reorderLineItems(accountId, transactionId, reorderedItems);
    },
    [accountId, transactionId, reorderLineItems]
  );

  // Create draggable items with explicit id for DraggableList
  const draggableLineItems: (LineItem & DraggableItem)[] = lineItems.map((item) => ({
    ...item,
    id: item.id,
  }));

  const renderLineItem = useCallback(
    (item: LineItem & DraggableItem, _index: number, isDragging: boolean) => {
      const isEditing = editingId === item.id;

      return (
        <div className={`line-item-row-content ${isDragging ? 'line-item-dragging' : ''}`}>
          {isEditing ? (
            <>
              <div className="line-col col-description">
                <input
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditItemChange}
                  className="line-input"
                  placeholder="Description"
                />
              </div>
              <div className="line-col col-quantity">
                <input
                  type="number"
                  name="quantity"
                  value={editForm.quantity}
                  onChange={handleEditItemChange}
                  className="line-input"
                  min="1"
                  step="1"
                />
              </div>
              <div className="line-col col-price">
                <input
                  type="number"
                  name="unit_price"
                  value={editForm.unit_price}
                  onChange={handleEditItemChange}
                  className="line-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="line-col col-total">
                {formatAmount(
                  (parseFloat(editForm.quantity) || 1) *
                    (parseFloat(editForm.unit_price) || 0)
                )}
              </div>
              <div className="line-col col-actions">
                <button
                  onClick={() => handleUpdateItem(item.id)}
                  className="action-button save-action"
                  disabled={isLoading}
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="action-button cancel-action"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="line-col col-description">
                <span className="item-description">{item.description}</span>
                {item.sku && (
                  <span className="item-sku">SKU: {item.sku}</span>
                )}
                {item.category && (
                  <span className="item-category">{item.category}</span>
                )}
              </div>
              <div className="line-col col-quantity">{item.quantity}</div>
              <div className="line-col col-price">
                {formatAmount(item.unit_price)}
              </div>
              <div className="line-col col-total">
                {formatAmount(item.total_price)}
              </div>
              <div className="line-col col-actions">
                <button
                  onClick={() => startEditing(item)}
                  className="action-button edit-action"
                  disabled={isLoading}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="action-button delete-action"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      );
    },
    [editingId, editForm, formatAmount, handleEditItemChange, handleUpdateItem, cancelEditing, startEditing, handleDeleteItem, isLoading]
  );

  return (
    <div className="line-item-list">
      {error && <div className="line-item-error">{error}</div>}

      {lineItems.length === 0 && !showAddForm ? (
        <div className="line-items-empty">
          <p>No line items for this transaction.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="add-item-button"
          >
            Add Line Item
          </button>
        </div>
      ) : (
        <>
          <div className="line-items-table">
            <div className="line-items-header">
              <div className="line-col col-drag-handle"></div>
              <div className="line-col col-description">Description</div>
              <div className="line-col col-quantity">Qty</div>
              <div className="line-col col-price">Unit Price</div>
              <div className="line-col col-total">Total</div>
              <div className="line-col col-actions">Actions</div>
            </div>

            <DraggableList
              items={draggableLineItems}
              onReorder={handleReorder}
              renderItem={renderLineItem}
              className="line-items-draggable"
              itemClassName="line-item-row"
              gap={0}
              disabled={editingId !== null}
            />

            {lineItems.length > 0 && (
              <div className="line-items-footer">
                <div className="line-col col-drag-handle"></div>
                <div className="line-col col-description">
                  <strong>Total</strong>
                </div>
                <div className="line-col col-quantity"></div>
                <div className="line-col col-price"></div>
                <div className="line-col col-total">
                  <strong>{formatAmount(calculateTotal())}</strong>
                </div>
                <div className="line-col col-actions"></div>
              </div>
            )}
          </div>

          {showAddForm ? (
            <form onSubmit={handleAddItem} className="add-item-form">
              <div className="add-item-row">
                <input
                  type="text"
                  name="description"
                  value={newItemForm.description}
                  onChange={handleNewItemChange}
                  className="line-input"
                  placeholder="Description *"
                  required
                />
                <input
                  type="number"
                  name="quantity"
                  value={newItemForm.quantity}
                  onChange={handleNewItemChange}
                  className="line-input small"
                  min="1"
                  step="1"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  name="unit_price"
                  value={newItemForm.unit_price}
                  onChange={handleNewItemChange}
                  className="line-input small"
                  min="0"
                  step="0.01"
                  placeholder="Price *"
                  required
                />
                <input
                  type="text"
                  name="sku"
                  value={newItemForm.sku}
                  onChange={handleNewItemChange}
                  className="line-input small"
                  placeholder="SKU"
                />
                <input
                  type="text"
                  name="category"
                  value={newItemForm.category}
                  onChange={handleNewItemChange}
                  className="line-input"
                  placeholder="Category"
                />
              </div>
              <div className="add-item-actions">
                <button
                  type="submit"
                  className="action-button save-action"
                  disabled={isLoading}
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItemForm(initialFormState);
                    setError(null);
                  }}
                  className="action-button cancel-action"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="add-item-button"
            >
              Add Line Item
            </button>
          )}
        </>
      )}
    </div>
  );
}
