// Basic CRUD mutations for listings
export {
  useCreateListing,
  useUpdateListing,
  useDeleteListing
} from './useListingCrudMutations'

// Admin operations using secure Edge Functions
export {
  useAdminOperations,
  useUpdateListingWithOffers,
  useCreateListingWithOffers,
  useDeleteListing as useDeleteListingWithEdgeFunction
} from '../useAdminOperations'

// Legacy complex listing operations (direct Supabase - deprecated)
export {
  useUpdateListingWithOffers as useUpdateListingWithOffersLegacy,
  useCreateListingWithOffers as useCreateListingWithOffersLegacy
} from './useListingOfferMutations'

// Listing interaction mutations
export {
  useToggleListingFavorite,
  useTrackListingView,
  useReportListing
} from './useListingInteractionMutations'

// Data management mutations
export {
  useRefreshData
} from './useDataMutations'

// Model management mutations
export {
  useCreateModel,
  useCheckModelExists
} from './useModelMutations'

// Note: Offer mutations are in useOffers.ts
// Note: Seller mutations are in useSellerMutations.ts