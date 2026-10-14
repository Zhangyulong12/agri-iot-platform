import { create } from 'zustand';

interface LayoutState {
  collapsed: boolean;
  mobileMenuOpen: boolean;
  toggleCollapsed: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  collapsed: false,
  mobileMenuOpen: false,
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
