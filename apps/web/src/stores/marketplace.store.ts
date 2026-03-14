import { create } from 'zustand'

interface MarketplaceState {
  /** Search keyword */
  searchQuery: string
  /** Device tier filter */
  deviceTier: string | null
  /** OS type filter */
  osType: string | null
  /** Sort mode */
  sortBy: 'popular' | 'newest' | 'price-asc' | 'price-desc'
  /** Active listing detail ID */
  activeListingId: string | null
  /** My rentals tab view */
  rentalsTab: 'renting' | 'renting-out'
  /** Sub-tab within renting-out */
  rentalsSubTab: 'contracts' | 'listings'

  setSearchQuery: (q: string) => void
  setDeviceTier: (tier: string | null) => void
  setOsType: (os: string | null) => void
  setSortBy: (sortBy: 'popular' | 'newest' | 'price-asc' | 'price-desc') => void
  setActiveListingId: (id: string | null) => void
  setRentalsTab: (tab: 'renting' | 'renting-out') => void
  setRentalsSubTab: (tab: 'contracts' | 'listings') => void
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  searchQuery: '',
  deviceTier: null,
  osType: null,
  sortBy: 'popular',
  activeListingId: null,
  rentalsTab: 'renting',
  rentalsSubTab: 'contracts',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDeviceTier: (deviceTier) => set({ deviceTier }),
  setOsType: (osType) => set({ osType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setActiveListingId: (activeListingId) => set({ activeListingId }),
  setRentalsTab: (rentalsTab) => set({ rentalsTab }),
  setRentalsSubTab: (rentalsSubTab) => set({ rentalsSubTab }),
}))
