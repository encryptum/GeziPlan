import { create } from 'zustand';

interface AiUiState {
  isOpen: boolean;
  pendingAction?: 'restoran' | 'kafe' | 'mola' | 'konaklama' | null;
  open: (action?: 'restoran' | 'kafe' | 'mola' | 'konaklama') => void;
  close: () => void;
  toggle: () => void;
  clearPendingAction: () => void;
}

export const useAiUiStore = create<AiUiState>((set) => ({
  isOpen: false,
  pendingAction: null,
  open: (action) => set({ isOpen: true, pendingAction: action ?? null }),
  close: () => set({ isOpen: false, pendingAction: null }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  clearPendingAction: () => set({ pendingAction: null }),
}));
