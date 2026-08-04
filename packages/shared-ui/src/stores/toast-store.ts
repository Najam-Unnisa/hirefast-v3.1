'use client';

import { create } from 'zustand';

export type ToastVariant = 'default' | 'destructive' | 'success';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id' | 'open'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let toastCount = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: `toast-${++toastCount}`,
          open: true,
        },
      ],
    })),
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.map((toast) => (toast.id === id ? { ...toast, open: false } : toast)),
    })),
  clear: () => set({ toasts: [] }),
}));
