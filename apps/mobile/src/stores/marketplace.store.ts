import { create } from 'zustand'

interface MarketplaceState {
  searchQuery: string
  deviceTier: string | null
  osType: string | null
  sortBy: 'popular' | 'newest' | 'price-asc' | 'price-desc'
  activeListingId: string | null
  rentalsTab: 'renting' | 'renting-out'
  rentalsSubTab: 'contracts' | 'listings'

  setSearchQuery: (q: string) => void
  setDeviceTier: (tier: string | null) => void
  setOsType: (os: string | null) => void
  setSortBy: (sortBy: MarketplaceState['sortBy']) => void
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
