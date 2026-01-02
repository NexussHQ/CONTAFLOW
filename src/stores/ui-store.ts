import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setSearchOpen: (open: boolean) => set({ searchOpen: open }),
}));
