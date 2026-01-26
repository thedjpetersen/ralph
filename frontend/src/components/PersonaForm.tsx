import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  usePersonasStore,
  type Persona,
  type CreatePersonaRequest,
} from '../stores/personas';
import { useAccountStore } from '../stores/account';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { toast } from '../stores/toast';
import './PersonaForm.css';

const SPENDING_PROFILES = [
  { value: '', label: 'Select a profile' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'custom', label: 'Custom' },
];

interface FormData {
  name: string;
  description: string;
  avatar_url: string;
  spending_profile: string;
  is_default: boolean;
  is_public: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  avatar_url: '',
  spending_profile: '',
  is_default: false,
  is_public: false,
};

export function PersonaForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { currentAccount } = useAccountStore();
  const {
    personas,
    currentPersona,
    isLoading,
    error,
    fetchPersona,
    createPersona,
    updatePersona,
  } = usePersonasStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clonedFromName, setClonedFromName] = useState<string | null>(null);

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingPersona = personas.find((p) => p.id === id);
      if (existingPersona) {
        populateForm(existingPersona);
      } else {
        fetchPersona(currentAccount.id, id)
          .then((fetched) => {
            populateForm(fetched);
          })
          .catch(() => {
            // Error handled by store
          });
      }
    }
  }, [id, currentAccount?.id, personas, fetchPersona]);

  useEffect(() => {
    if (currentPersona && currentPersona.id === id) {
      populateForm(currentPersona);
    }
  }, [currentPersona, id]);

  const populateForm = (persona: Persona) => {
    setFormData({
      name: persona.name,
      description: persona.description || '',
      avatar_url: persona.avatar_url || '',
      spending_profile: persona.spending_profile || '',
      is_default: persona.is_default,
      is_public: persona.is_public || false,
    });
    if (persona.cloned_from_name) {
      setClonedFromName(persona.cloned_from_name);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) {
      setSaveError('No account selected');
      return;
    }

    if (!formData.name.trim()) {
      setSaveError('Persona name is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const personaData: CreatePersonaRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      avatar_url: formData.avatar_url.trim() || undefined,
      spending_profile: formData.spending_profile || undefined,
      is_default: formData.is_default,
      is_public: formData.is_public,
    };

    try {
      if (isEditing && id) {
        await updatePersona(currentAccount.id, id, personaData);
        toast.success('Persona updated successfully');
        navigate('/personas');
      } else {
        await createPersona(currentAccount.id, personaData);
        toast.success('Persona created successfully');
        navigate('/personas');
      }
    } catch {
      const errorMsg = isEditing ? 'Failed to update persona' : 'Failed to create persona';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="persona-form-page">
          <div className="form-error-container">
            <h2>No Account Selected</h2>
            <p>Please select an account to create or edit personas.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="persona-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="persona-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/personas')} className="back-button">
              Back to Personas
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="persona-form-page">
        <div className="form-header">
          <Link to="/personas" className="back-link">
            &larr; Back to Personas
          </Link>
          <h1>{isEditing ? 'Edit Persona' : 'Create Persona'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update persona details'
              : 'Create a new spending persona'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="persona-form">
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Persona Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                maxLength={100}
                placeholder="e.g., Personal, Business, Family"
              />
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
                maxLength={500}
                placeholder="Brief description of this persona..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatar_url" className="form-label">
                Avatar URL
              </label>
              <input
                type="url"
                id="avatar_url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleInputChange}
                className="form-input"
                placeholder="https://example.com/avatar.png"
              />
              <p className="form-help">
                URL to an image that represents this persona.
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2>Settings</h2>

            {clonedFromName && (
              <div className="lineage-banner">
                <span className="lineage-icon">&#8618;</span>
                <span>Based on <strong>{clonedFromName}</strong></span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="spending_profile" className="form-label">
                Spending Profile
              </label>
              <select
                id="spending_profile"
                name="spending_profile"
                value={formData.spending_profile}
                onChange={handleInputChange}
                className="form-select"
              >
                {SPENDING_PROFILES.map((profile) => (
                  <option key={profile.value} value={profile.value}>
                    {profile.label}
                  </option>
                ))}
              </select>
              <p className="form-help">
                The spending profile affects budget recommendations and alerts.
              </p>
            </div>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_default"
                name="is_default"
                checked={formData.is_default}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_default" className="checkbox-label">
                Set as default persona
              </label>
            </div>
            <p className="form-help checkbox-help">
              The default persona is used when no specific persona is selected.
            </p>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_public"
                name="is_public"
                checked={formData.is_public}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_public" className="checkbox-label">
                Make this persona public
              </label>
            </div>
            <p className="form-help checkbox-help">
              Public personas can be discovered and cloned by other users.
            </p>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/personas')}
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
                  : 'Create Persona'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
