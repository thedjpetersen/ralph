import { create } from 'zustand';
import {
  communityPersonasApi,
  personasApi,
  type Persona,
  type ListCommunityPersonasParams,
  type CreatePersonaRequest,
} from '../api/client';
import { executeOptimisticMutation, generateMutationId } from './optimistic';

interface CommunityPersonasState {
  // State
  communityPersonas: Persona[];
  isLoading: boolean;
  error: string | null;
  total: number;
  searchQuery: string;

  // Actions
  fetchCommunityPersonas: (params?: ListCommunityPersonasParams) => Promise<void>;
  setSearchQuery: (query: string) => void;
  cloneFromCommunity: (
    accountId: string,
    persona: Persona,
    name: string,
    isPublic?: boolean
  ) => Promise<Persona | null>;
  trackUsage: (personaId: string) => Promise<void>;
}

// Generate optimistic persona ID
function generateOptimisticPersonaId(): string {
  return `optimistic-persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useCommunityPersonasStore = create<CommunityPersonasState>()((set) => ({
  // Initial state
  communityPersonas: [],
  isLoading: false,
  error: null,
  total: 0,
  searchQuery: '',

  // Fetch community personas from API
  fetchCommunityPersonas: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await communityPersonasApi.list(params);
      set({
        communityPersonas: response.personas,
        total: response.total,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Clone a community persona to user's account
  cloneFromCommunity: async (accountId, sourcePersona, name, isPublic = false) => {
    // Create clone data from source community persona
    const cloneData: CreatePersonaRequest = {
      name,
      description: sourcePersona.description,
      avatar_url: sourcePersona.avatar_url,
      spending_profile: sourcePersona.spending_profile,
      preferences: sourcePersona.preferences,
      metadata: sourcePersona.metadata,
      is_default: false, // Clones are never default
      cloned_from: sourcePersona.id,
      cloned_from_name: sourcePersona.name,
      is_public: isPublic,
    };

    // Create optimistic persona
    const optimisticId = generateOptimisticPersonaId();
    const optimisticPersona: Persona = {
      id: optimisticId,
      account_id: accountId,
      name,
      description: sourcePersona.description,
      avatar_url: sourcePersona.avatar_url,
      spending_profile: sourcePersona.spending_profile,
      preferences: sourcePersona.preferences,
      metadata: sourcePersona.metadata,
      is_default: false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cloned_from: sourcePersona.id,
      cloned_from_name: sourcePersona.name,
      is_public: isPublic,
    };

    // Execute mutation
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('community-persona-clone'),
      type: 'persona:clone-from-community',
      optimisticData: optimisticPersona,
      previousData: null,
      mutationFn: () => personasApi.create(accountId, cloneData),
      onSuccess: () => {
        // Update clone count in community list
        set((state) => ({
          communityPersonas: state.communityPersonas.map((p) =>
            p.id === sourcePersona.id
              ? { ...p, clone_count: (p.clone_count || 0) + 1 }
              : p
          ),
        }));
      },
      onRollback: () => {
        // No local state to rollback for community store
      },
      successMessage: `Added "${sourcePersona.name}" to your personas as "${name}"`,
      errorMessage: 'Failed to clone community persona',
    });

    return result;
  },

  // Track usage of a community persona
  trackUsage: async (personaId) => {
    try {
      await communityPersonasApi.trackUsage(personaId);
      // Update use count locally
      set((state) => ({
        communityPersonas: state.communityPersonas.map((p) =>
          p.id === personaId ? { ...p, use_count: (p.use_count || 0) + 1 } : p
        ),
      }));
    } catch {
      // Silently fail - usage tracking is not critical
    }
  },
}));

// Re-export types for convenience
export type { Persona, ListCommunityPersonasParams };
