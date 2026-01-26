import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  queue: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION = 4000;

let toastId = 0;

function generateId(): string {
  return `toast-${++toastId}-${Date.now()}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  queue: [],

  addToast: (toastData) => {
    const id = generateId();
    const toast: Toast = {
      id,
      duration: DEFAULT_DURATION,
      ...toastData,
    };

    const { toasts, queue } = get();

    if (toasts.length >= MAX_VISIBLE_TOASTS) {
      // Add to queue if max visible reached
      set({ queue: [...queue, toast] });
    } else {
      set({ toasts: [...toasts, toast] });
    }

    return id;
  },

  removeToast: (id) => {
    const { toasts, queue } = get();
    const newToasts = toasts.filter((t) => t.id !== id);

    // If there's space and items in queue, move one from queue to visible
    if (newToasts.length < MAX_VISIBLE_TOASTS && queue.length > 0) {
      const [nextToast, ...remainingQueue] = queue;
      set({
        toasts: [...newToasts, nextToast],
        queue: remainingQueue,
      });
    } else {
      set({ toasts: newToasts });
    }
  },

  clearAllToasts: () => {
    set({ toasts: [], queue: [] });
  },
}));

// Convenience functions for creating toasts
export function toast(message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) {
  return useToastStore.getState().addToast({
    type: 'info',
    message,
    ...options,
  });
}

toast.success = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
  return useToastStore.getState().addToast({
    type: 'success',
    message,
    ...options,
  });
};

toast.error = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
  return useToastStore.getState().addToast({
    type: 'error',
    message,
    ...options,
  });
};

toast.info = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
  return useToastStore.getState().addToast({
    type: 'info',
    message,
    ...options,
  });
};

toast.warning = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
  return useToastStore.getState().addToast({
    type: 'warning',
    message,
    ...options,
  });
};

toast.dismiss = (id: string) => {
  useToastStore.getState().removeToast(id);
};

toast.dismissAll = () => {
  useToastStore.getState().clearAllToasts();
};
