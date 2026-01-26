import { create } from 'zustand';
import {
  personasApi,
  type Persona,
  type CreatePersonaRequest,
  type UpdatePersonaRequest,
  type ListPersonasParams,
} from '../api/client';
import { executeOptimisticMutation, generateMutationId } from './optimistic';
import { toast } from './toast';

interface PersonasState {
  // State
  personas: Persona[];
  currentPersona: Persona | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  setPersonas: (personas: Persona[]) => void;
  setCurrentPersona: (persona: Persona | null) => void;
  fetchPersonas: (accountId: string, params?: ListPersonasParams) => Promise<void>;
  fetchPersona: (accountId: string, id: string) => Promise<Persona>;
  createPersona: (accountId: string, data: CreatePersonaRequest) => Promise<Persona | null>;
  updatePersona: (accountId: string, id: string, data: UpdatePersonaRequest) => Promise<Persona | null>;
  deletePersona: (accountId: string, id: string) => Promise<boolean>;
  setDefault: (accountId: string, id: string) => Promise<Persona | null>;
  /** Switch to a different persona (optimistic author toggle) */
  switchPersona: (id: string) => void;
}

// Generate optimistic persona ID
function generateOptimisticPersonaId(): string {
  return `optimistic-persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usePersonasStore = create<PersonasState>()((set, get) => ({
  // Initial state
  personas: [],
  currentPersona: null,
  isLoading: false,
  error: null,
  total: 0,

  // Setter for personas list
  setPersonas: (personas) => {
    set({ personas });
  },

  // Setter for current persona (immediate, local only)
  setCurrentPersona: (persona) => {
    set({ currentPersona: persona });
  },

  // Fetch all personas from API (no optimistic update for reads)
  fetchPersonas: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await personasApi.list(accountId, params);
      set({ personas: response.personas, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single persona by ID (no optimistic update for reads)
  fetchPersona: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const persona = await personasApi.get(accountId, id);
      set({ currentPersona: persona, isLoading: false });
      return persona;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new persona with optimistic update
  createPersona: async (accountId, data) => {
    const { personas, total } = get();

    // Create optimistic persona
    const optimisticId = generateOptimisticPersonaId();
    const optimisticPersona: Persona = {
      id: optimisticId,
      account_id: accountId,
      name: data.name,
      description: data.description,
      avatar_url: data.avatar_url,
      spending_profile: data.spending_profile,
      preferences: data.preferences,
      metadata: data.metadata,
      is_default: data.is_default || false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      personas: [...personas, optimisticPersona],
      total: total + 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('persona-create'),
      type: 'persona:create',
      optimisticData: optimisticPersona,
      previousData: { personas, total },
      mutationFn: () => personasApi.create(accountId, data),
      onSuccess: (newPersona) => {
        // Replace optimistic persona with real one
        set((state) => ({
          personas: state.personas
            .filter(p => p.id !== optimisticId)
            .concat(newPersona),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ personas, total });
      },
      successMessage: 'Persona created',
      errorMessage: 'Failed to create persona',
    });

    return result;
  },

  // Update a persona with optimistic update
  updatePersona: async (accountId, id, data) => {
    const { personas, currentPersona } = get();
    const existingPersona = personas.find(p => p.id === id);

    if (!existingPersona) {
      toast.error('Persona not found');
      return null;
    }

    // Create optimistic updated persona
    const optimisticPersona: Persona = {
      ...existingPersona,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      personas: personas.map(p => p.id === id ? optimisticPersona : p),
      currentPersona: currentPersona?.id === id ? optimisticPersona : currentPersona,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('persona-update'),
      type: 'persona:update',
      optimisticData: optimisticPersona,
      previousData: existingPersona,
      mutationFn: () => personasApi.update(accountId, id, data),
      onSuccess: (updatedPersona) => {
        // Apply server response
        set((state) => ({
          personas: state.personas.map(p => p.id === id ? updatedPersona : p),
          currentPersona: state.currentPersona?.id === id ? updatedPersona : state.currentPersona,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          personas: state.personas.map(p => p.id === id ? existingPersona : p),
          currentPersona: state.currentPersona?.id === id ? existingPersona : state.currentPersona,
        }));
      },
      errorMessage: 'Failed to update persona',
    });

    return result;
  },

  // Delete a persona with optimistic update
  deletePersona: async (accountId, id) => {
    const { personas, currentPersona, total } = get();
    const existingPersona = personas.find(p => p.id === id);

    if (!existingPersona) {
      toast.error('Persona not found');
      return false;
    }

    // Apply optimistic delete immediately
    set({
      personas: personas.filter(p => p.id !== id),
      currentPersona: currentPersona?.id === id ? null : currentPersona,
      total: total - 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('persona-delete'),
      type: 'persona:delete',
      optimisticData: null,
      previousData: { personas, currentPersona, total },
      mutationFn: () => personasApi.delete(accountId, id),
      onRollback: () => {
        // Restore previous state
        set({ personas, currentPersona, total });
      },
      errorMessage: 'Failed to delete persona',
    });

    return result !== null;
  },

  // Set a persona as default with optimistic update (author toggle)
  setDefault: async (accountId, id) => {
    const { personas, currentPersona } = get();
    const existingPersona = personas.find(p => p.id === id);

    if (!existingPersona) {
      toast.error('Persona not found');
      return null;
    }

    // Save previous default state for rollback
    const previousDefaultPersona = personas.find(p => p.is_default);

    // Create optimistic state - set all to non-default except the selected one
    const optimisticPersonas = personas.map(p => ({
      ...p,
      is_default: p.id === id,
      updated_at: p.id === id ? new Date().toISOString() : p.updated_at,
    }));

    const optimisticCurrentPersona = currentPersona?.id === id
      ? { ...currentPersona, is_default: true, updated_at: new Date().toISOString() }
      : currentPersona;

    // Apply optimistic update immediately - toggle reflects instantly
    set({
      personas: optimisticPersonas,
      currentPersona: optimisticCurrentPersona,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('persona-set-default'),
      type: 'persona:set-default',
      optimisticData: { id, personas: optimisticPersonas },
      previousData: { personas, currentPersona, previousDefaultId: previousDefaultPersona?.id },
      mutationFn: () => personasApi.setDefault(accountId, id),
      onSuccess: (updatedPersona) => {
        // Ensure server response is applied
        set((state) => ({
          personas: state.personas.map(p => p.id === id ? updatedPersona : p),
          currentPersona: state.currentPersona?.id === id ? updatedPersona : state.currentPersona,
        }));
      },
      onRollback: () => {
        // Restore previous default state
        set({
          personas,
          currentPersona,
        });
      },
      successMessage: 'Default persona changed',
      errorMessage: 'Failed to set default persona',
    });

    return result;
  },

  // Switch to a different persona (immediate local change)
  switchPersona: (id) => {
    const { personas } = get();
    const persona = personas.find(p => p.id === id);

    if (persona) {
      // Immediate local switch - no server call needed for current selection
      set({ currentPersona: persona });
    }
  },
}));

// Re-export types for convenience
export type { Persona, CreatePersonaRequest, UpdatePersonaRequest };
export type { PersonaStatus, ListPersonasParams } from '../api/client';
