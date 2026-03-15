import { create } from 'zustand'

interface ShopState {
  activeCategoryId: string | null
  setActiveCategoryId: (id: string | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeProductId: string | null
  setActiveProductId: (id: string | null) => void
  sortBy: 'default' | 'sales' | 'newest' | 'price-asc' | 'price-desc'
  setSortBy: (s: ShopState['sortBy']) => void
  overlay: 'cart' | 'orders' | 'favorites' | null
  setOverlay: (o: ShopState['overlay']) => void
  lastOrderId: string | null
}

export const useShopStore = create<ShopState>((set) => ({
  activeCategoryId: null,
  setActiveCategoryId: (id) => set({ activeCategoryId: id }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  activeProductId: null,
  setActiveProductId: (id) => set({ activeProductId: id }),
  sortBy: 'default',
  setSortBy: (s) => set({ sortBy: s }),
  overlay: null,
  setOverlay: (o) => set({ overlay: o }),
  lastOrderId: null,
}))
