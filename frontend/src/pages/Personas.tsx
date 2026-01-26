import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonasStore, type Persona, type PersonaStatus } from '../stores/personas';
import { useCommunityPersonasStore } from '../stores/communityPersonas';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ClonePersonaDialog } from '../components/ClonePersonaDialog';
import { CloneCommunityPersonaDialog } from '../components/CloneCommunityPersonaDialog';
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation';
import { toast } from '../stores/toast';
import './Personas.css';

type TabType = 'my-personas' | 'community';

const STATUS_OPTIONS: { value: PersonaStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function Personas() {
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    personas,
    isLoading,
    error,
    fetchPersonas,
    deletePersona,
    setDefault,
    clonePersona,
  } = usePersonasStore();

  const {
    communityPersonas,
    isLoading: isCommunityLoading,
    error: communityError,
    searchQuery,
    fetchCommunityPersonas,
    setSearchQuery,
    cloneFromCommunity,
  } = useCommunityPersonasStore();

  const [activeTab, setActiveTab] = useState<TabType>('my-personas');
  const [statusFilter, setStatusFilter] = useState<PersonaStatus | ''>('');
  const [personaToClone, setPersonaToClone] = useState<Persona | null>(null);
  const [communityPersonaToClone, setCommunityPersonaToClone] = useState<Persona | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  // Delete confirmation hook
  const {
    itemToDelete: personaToDelete,
    isDeleting,
    confirmDelete,
    cancelDelete,
    executeDelete,
    isOpen: showDeleteConfirm,
  } = useDeleteConfirmation<Persona>({
    onDelete: async (persona) => {
      if (!currentAccount?.id) return;
      await deletePersona(currentAccount.id, persona.id);
    },
    onSuccess: () => {
      toast.success('Persona deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete persona');
    },
  });

  useEffect(() => {
    if (currentAccount?.id) {
      fetchPersonas(currentAccount.id, { status: statusFilter || undefined });
    }
  }, [currentAccount?.id, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'community') {
      fetchCommunityPersonas({ search: searchQuery || undefined });
    }
  }, [activeTab, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as PersonaStatus | '');
  }, []);

  const getStatusClass = (status: PersonaStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  };

  const handleCreateNew = () => {
    navigate('/personas/new');
  };

  const handleEdit = (persona: Persona) => {
    navigate(`/personas/${persona.id}/edit`);
  };

  const handleSetDefault = async (persona: Persona) => {
    if (!currentAccount?.id) return;
    try {
      await setDefault(currentAccount.id, persona.id);
      toast.success(`${persona.name} set as default persona`);
    } catch {
      toast.error('Failed to set default persona');
    }
  };

  const handleClone = (persona: Persona) => {
    setPersonaToClone(persona);
  };

  const handleCloneConfirm = async (data: { name: string; is_public: boolean }) => {
    if (!currentAccount?.id || !personaToClone) return;
    setIsCloning(true);
    try {
      const result = await clonePersona(currentAccount.id, personaToClone.id, data);
      if (result) {
        setPersonaToClone(null);
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleCloneCancel = () => {
    if (!isCloning) {
      setPersonaToClone(null);
    }
  };

  const handleCommunityClone = (persona: Persona) => {
    setCommunityPersonaToClone(persona);
  };

  const handleCommunityCloneConfirm = async (data: { name: string; is_public: boolean }) => {
    if (!currentAccount?.id || !communityPersonaToClone) return;
    setIsCloning(true);
    try {
      const result = await cloneFromCommunity(
        currentAccount.id,
        communityPersonaToClone,
        data.name,
        data.is_public
      );
      if (result) {
        setCommunityPersonaToClone(null);
        // Refresh user's personas list
        fetchPersonas(currentAccount.id, { status: statusFilter || undefined });
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleCommunityCloneCancel = () => {
    if (!isCloning) {
      setCommunityPersonaToClone(null);
    }
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="personas-page">
          <div className="personas-error">
            <h2>No Account Selected</h2>
            <p>Please select an account to view personas.</p>
            <button onClick={() => navigate('/accounts')} className="retry-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && personas.length === 0) {
    return (
      <PageTransition>
        <div className="personas-page">
          <div className="personas-header">
            <h1>Personas</h1>
            <p className="personas-subtitle">Manage spending personas and profiles</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && personas.length === 0) {
    return (
      <PageTransition>
        <div className="personas-page">
          <div className="personas-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchPersonas(currentAccount.id)}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="personas-page">
        <div className="personas-header">
          <div className="personas-header-row">
            <div>
              <h1>Authors</h1>
              <p className="personas-subtitle">Manage your authors and discover community creations</p>
            </div>
            {activeTab === 'my-personas' && (
              <button onClick={handleCreateNew} className="create-persona-button">
                Add Author
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="personas-tabs">
          <button
            className={`personas-tab ${activeTab === 'my-personas' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-personas')}
          >
            My Authors
          </button>
          <button
            className={`personas-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Community
          </button>
        </div>

        {/* My Personas Tab */}
        {activeTab === 'my-personas' && (
          <>
            <div className="personas-filters">
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="filter-select"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {personas.length === 0 ? (
              <div className="personas-empty">
                <h2>No Authors Found</h2>
                <p>You haven't created any authors yet.</p>
                <button onClick={handleCreateNew} className="create-persona-link">
                  Add your first author
                </button>
              </div>
            ) : (
              <div className="personas-grid">
                {personas.map((persona) => (
                  <div key={persona.id} className="persona-card">
                    <div className="persona-card-header">
                      {persona.avatar_url ? (
                        <div className="persona-avatar">
                          <img src={persona.avatar_url} alt={persona.name} />
                        </div>
                      ) : (
                        <div className="persona-avatar-placeholder">
                          {persona.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="persona-card-info">
                        <h3 className="persona-card-name">
                          {persona.name}
                          {persona.is_default && (
                            <span className="default-badge">Default</span>
                          )}
                          {persona.is_public && (
                            <span className="public-badge">Public</span>
                          )}
                        </h3>
                        <div className="persona-status-row">
                          <span className={`persona-status ${getStatusClass(persona.status)}`}>
                            {persona.status}
                          </span>
                          {persona.cloned_from_name && (
                            <span className="persona-lineage">
                              Based on {persona.cloned_from_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {persona.description && (
                      <p className="persona-card-description">{persona.description}</p>
                    )}
                    <div className="persona-card-details">
                      {persona.spending_profile && (
                        <div className="persona-detail">
                          <span className="detail-label">Spending Profile</span>
                          <span className="detail-value">{persona.spending_profile}</span>
                        </div>
                      )}
                      <div className="persona-detail">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">
                          {new Date(persona.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Usage stats for public personas */}
                      {persona.is_public && (
                        <>
                          <div className="persona-detail">
                            <span className="detail-label">Clones</span>
                            <span className="detail-value">{persona.clone_count || 0}</span>
                          </div>
                          <div className="persona-detail">
                            <span className="detail-label">Uses</span>
                            <span className="detail-value">{persona.use_count || 0}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="persona-card-actions">
                      <button
                        onClick={() => handleEdit(persona)}
                        className="edit-persona-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleClone(persona)}
                        className="clone-persona-button"
                        title="Create a copy of this author"
                      >
                        Clone
                      </button>
                      {!persona.is_default && (
                        <button
                          onClick={() => handleSetDefault(persona)}
                          className="default-persona-button"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(persona)}
                        className="delete-persona-button"
                        disabled={persona.is_default}
                        title={persona.is_default ? 'Cannot delete default author' : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Community Tab */}
        {activeTab === 'community' && (
          <>
            <div className="personas-filters">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search community authors..."
                className="search-input"
              />
            </div>

            {isCommunityLoading ? (
              <AccountsListSkeleton count={6} />
            ) : communityError ? (
              <div className="personas-error">
                <h2>Error</h2>
                <p>{communityError}</p>
                <button
                  onClick={() => fetchCommunityPersonas({ search: searchQuery || undefined })}
                  className="retry-button"
                >
                  Retry
                </button>
              </div>
            ) : communityPersonas.length === 0 ? (
              <div className="personas-empty">
                <h2>No Community Authors Found</h2>
                <p>
                  {searchQuery
                    ? 'No authors match your search. Try different keywords.'
                    : 'No authors have been shared yet. Be the first to share!'}
                </p>
              </div>
            ) : (
              <div className="personas-grid">
                {communityPersonas.map((persona) => (
                  <div key={persona.id} className="persona-card community-card">
                    <div className="persona-card-header">
                      {persona.avatar_url ? (
                        <div className="persona-avatar">
                          <img src={persona.avatar_url} alt={persona.name} />
                        </div>
                      ) : (
                        <div className="persona-avatar-placeholder">
                          {persona.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="persona-card-info">
                        <h3 className="persona-card-name">{persona.name}</h3>
                        {/* Creator attribution */}
                        <div className="persona-creator">
                          {persona.creator_avatar_url ? (
                            <img
                              src={persona.creator_avatar_url}
                              alt={persona.creator_name || 'Creator'}
                              className="creator-avatar"
                            />
                          ) : (
                            <span className="creator-avatar-placeholder">
                              {(persona.creator_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="creator-name">
                            by {persona.creator_name || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {persona.description && (
                      <p className="persona-card-description">{persona.description}</p>
                    )}
                    <div className="persona-card-details">
                      {persona.spending_profile && (
                        <div className="persona-detail">
                          <span className="detail-label">Style</span>
                          <span className="detail-value">{persona.spending_profile}</span>
                        </div>
                      )}
                      <div className="persona-detail">
                        <span className="detail-label">Clones</span>
                        <span className="detail-value">{persona.clone_count || 0}</span>
                      </div>
                      <div className="persona-detail">
                        <span className="detail-label">Uses</span>
                        <span className="detail-value">{persona.use_count || 0}</span>
                      </div>
                    </div>
                    <div className="persona-card-actions">
                      <button
                        onClick={() => handleCommunityClone(persona)}
                        className="clone-persona-button community-clone-button"
                        title="Add this author to your collection"
                      >
                        Add to My Authors
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={cancelDelete}
          onConfirm={executeDelete}
          title="Delete Author"
          description={`Are you sure you want to delete "${personaToDelete?.name}"?`}
          confirmLabel="Delete Author"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
        >
          <p>This action cannot be undone. All data associated with this author will be permanently removed.</p>
        </ConfirmDialog>

        {/* Clone Persona Dialog */}
        <ClonePersonaDialog
          isOpen={personaToClone !== null}
          onClose={handleCloneCancel}
          onConfirm={handleCloneConfirm}
          persona={personaToClone}
          isLoading={isCloning}
        />

        {/* Clone Community Persona Dialog */}
        <CloneCommunityPersonaDialog
          isOpen={communityPersonaToClone !== null}
          onClose={handleCommunityCloneCancel}
          onConfirm={handleCommunityCloneConfirm}
          persona={communityPersonaToClone}
          isLoading={isCloning}
        />
      </div>
    </PageTransition>
  );
}
