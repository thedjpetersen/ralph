import { create } from 'zustand';
import {
  personasApi,
  type Persona,
  type CreatePersonaRequest,
  type UpdatePersonaRequest,
  type ListPersonasParams,
} from '../api/client';

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
  createPersona: (accountId: string, data: CreatePersonaRequest) => Promise<Persona>;
  updatePersona: (accountId: string, id: string, data: UpdatePersonaRequest) => Promise<Persona>;
  deletePersona: (accountId: string, id: string) => Promise<void>;
  setDefault: (accountId: string, id: string) => Promise<Persona>;
}

export const usePersonasStore = create<PersonasState>()((set) => ({
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

  // Setter for current persona
  setCurrentPersona: (persona) => {
    set({ currentPersona: persona });
  },

  // Fetch all personas from API
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

  // Fetch a single persona by ID
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

  // Create a new persona
  createPersona: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newPersona = await personasApi.create(accountId, data);
      set((state) => ({
        personas: [...state.personas, newPersona],
        total: state.total + 1,
        isLoading: false,
      }));
      return newPersona;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a persona
  updatePersona: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPersona = await personasApi.update(accountId, id, data);
      set((state) => ({
        personas: state.personas.map((p) => (p.id === id ? updatedPersona : p)),
        currentPersona:
          state.currentPersona?.id === id ? updatedPersona : state.currentPersona,
        isLoading: false,
      }));
      return updatedPersona;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a persona
  deletePersona: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await personasApi.delete(accountId, id);
      set((state) => ({
        personas: state.personas.filter((p) => p.id !== id),
        currentPersona: state.currentPersona?.id === id ? null : state.currentPersona,
        total: state.total - 1,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Set a persona as default
  setDefault: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPersona = await personasApi.setDefault(accountId, id);
      set((state) => ({
        personas: state.personas.map((p) => ({
          ...p,
          is_default: p.id === id,
        })),
        currentPersona:
          state.currentPersona?.id === id ? updatedPersona : state.currentPersona,
        isLoading: false,
      }));
      return updatedPersona;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },
}));

// Re-export types for convenience
export type { Persona, CreatePersonaRequest, UpdatePersonaRequest };
export type { PersonaStatus, ListPersonasParams } from '../api/client';
