import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStoresStore, type Store, type StoreType, type CreateStoreRequest } from '../stores/stores';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { Link } from 'react-router-dom';
import './StoreForm.css';

const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'gas', label: 'Gas Station' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  name: string;
  display_name: string;
  type: StoreType;
  description: string;
  website: string;
  phone: string;
  email: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  aliases: string;
  receipt_patterns: string;
  tags: string;
}

const initialFormData: FormData = {
  name: '',
  display_name: '',
  type: 'retail',
  description: '',
  website: '',
  phone: '',
  email: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  aliases: '',
  receipt_patterns: '',
  tags: '',
};

export function StoreForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { stores, currentStore, isLoading, error, fetchStore, createStore, updateStore } =
    useStoresStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load store data for editing
  useEffect(() => {
    if (id) {
      const existingStore = stores.find((s) => s.id === id);
      if (existingStore) {
        populateForm(existingStore);
      } else {
        fetchStore(id)
          .then((fetched) => {
            populateForm(fetched);
          })
          .catch(() => {
            // Error handled by store
          });
      }
    }
  }, [id, stores, fetchStore]);

  // Update form when currentStore changes
  useEffect(() => {
    if (currentStore && currentStore.id === id) {
      populateForm(currentStore);
    }
  }, [currentStore, id]);

  const populateForm = (store: Store) => {
    setFormData({
      name: store.name,
      display_name: store.display_name || '',
      type: store.type,
      description: store.description || '',
      website: store.website || '',
      phone: store.phone || '',
      email: store.email || '',
      street1: store.address?.street1 || '',
      street2: store.address?.street2 || '',
      city: store.address?.city || '',
      state: store.address?.state || '',
      postal_code: store.address?.postal_code || '',
      country: store.address?.country || '',
      aliases: store.aliases?.join(', ') || '',
      receipt_patterns: store.receipt_patterns?.join('\n') || '',
      tags: store.tags?.join(', ') || '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
  };

  const parseCommaSeparated = (value: string): string[] => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const parseNewlineSeparated = (value: string): string[] => {
    return value
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const hasAddress =
      formData.street1 ||
      formData.city ||
      formData.state ||
      formData.postal_code ||
      formData.country;

    const storeData: CreateStoreRequest = {
      name: formData.name,
      display_name: formData.display_name || undefined,
      type: formData.type,
      description: formData.description || undefined,
      website: formData.website || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: hasAddress
        ? {
            street1: formData.street1 || undefined,
            street2: formData.street2 || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            postal_code: formData.postal_code || undefined,
            country: formData.country || undefined,
          }
        : undefined,
      aliases: parseCommaSeparated(formData.aliases).length > 0
        ? parseCommaSeparated(formData.aliases)
        : undefined,
      receipt_patterns: parseNewlineSeparated(formData.receipt_patterns).length > 0
        ? parseNewlineSeparated(formData.receipt_patterns)
        : undefined,
      tags: parseCommaSeparated(formData.tags).length > 0
        ? parseCommaSeparated(formData.tags)
        : undefined,
    };

    try {
      if (isEditing && id) {
        await updateStore(id, storeData);
        navigate(`/stores/${id}`);
      } else {
        const newStore = await createStore(storeData);
        navigate(`/stores/${newStore.id}`);
      }
    } catch {
      setSaveError(isEditing ? 'Failed to update store' : 'Failed to create store');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="store-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="store-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/stores')} className="back-button">
              Back to Stores
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="store-form-page">
        <div className="form-header">
          <Link to={isEditing ? `/stores/${id}` : '/stores'} className="back-link">
            &larr; {isEditing ? 'Back to Store' : 'Back to Stores'}
          </Link>
          <h1>{isEditing ? 'Edit Store' : 'Create Store'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update store information and settings'
              : 'Add a new merchant store to the system'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="store-form">
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Store Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                minLength={1}
                maxLength={200}
                placeholder="e.g., Walmart"
              />
              <p className="form-help">
                The primary name used to identify this store.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="display_name" className="form-label">
                Display Name
              </label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                className="form-input"
                maxLength={200}
                placeholder="e.g., Walmart Supercenter"
              />
              <p className="form-help">
                Optional display name shown to users.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Store Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                {STORE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="form-help">
                The category that best describes this store.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Brief description of the store..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Contact Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="website" className="form-label">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Address</h2>

            <div className="form-group">
              <label htmlFor="street1" className="form-label">
                Street Address
              </label>
              <input
                type="text"
                id="street1"
                name="street1"
                value={formData.street1}
                onChange={handleInputChange}
                className="form-input"
                placeholder="123 Main St"
              />
            </div>

            <div className="form-group">
              <label htmlFor="street2" className="form-label">
                Address Line 2
              </label>
              <input
                type="text"
                id="street2"
                name="street2"
                value={formData.street2}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Suite 100"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city" className="form-label">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state" className="form-label">
                  State/Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="postal_code" className="form-label">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="12345"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country" className="form-label">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Matching & Organization</h2>

            <div className="form-group">
              <label htmlFor="aliases" className="form-label">
                Aliases
              </label>
              <input
                type="text"
                id="aliases"
                name="aliases"
                value={formData.aliases}
                onChange={handleInputChange}
                className="form-input"
                placeholder="WAL-MART, WALMART INC, WM SUPERCENTER"
              />
              <p className="form-help">
                Comma-separated list of alternative names for this store.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="receipt_patterns" className="form-label">
                Receipt Patterns
              </label>
              <textarea
                id="receipt_patterns"
                name="receipt_patterns"
                value={formData.receipt_patterns}
                onChange={handleInputChange}
                className="form-textarea form-code"
                rows={4}
                placeholder="WALMART.*SUPERCENTER&#10;WAL\s*MART&#10;WM\s+SC"
              />
              <p className="form-help">
                One regex pattern per line for matching receipt text.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="tags" className="form-label">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="form-input"
                placeholder="groceries, household, pharmacy"
              />
              <p className="form-help">
                Comma-separated tags for categorization.
              </p>
            </div>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/stores/${id}` : '/stores')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Store'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
