import { createRouter, createWebHistory } from 'vue-router'

import Home from '../pages/Home.vue'
import Listings from '../pages/Listings.vue'
import Listing from '../pages/Listing.vue'
import ListingCreation from '../pages/ListingCreation.vue'
import About from '../pages/About.vue'
import AdminListings from '../pages/AdminListings.vue'
import AdminMakes from '../pages/AdminMakes.vue'
import AdminSellers from '../pages/AdminSellers.vue'
import AdminModels from '../pages/AdminModels.vue'
import AdminBodyTypes from '../pages/AdminBodyTypes.vue'
import AdminTransmissions from '../pages/AdminTransmissions.vue'
import AdminFuelTypes from '../pages/AdminFuelTypes.vue'
import AdminColours from '../pages/AdminColours.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/listings', component: Listings },
  {
    path: '/listing/:id',   // 🔥 Updated path to match singular form
    name: 'Listing',        // 🔥 Added a named route
    component: Listing,
    props: true             // 🔥 Enable route params as props
  },
  { path: '/create', component: ListingCreation },
  { path: '/about', component: About },
  
  // Admin routes
  { path: '/admin/listings', component: AdminListings, name: 'AdminListings' },
  { path: '/admin/makes', component: AdminMakes, name: 'AdminMakes' },
  { path: '/admin/sellers', component: AdminSellers, name: 'AdminSellers' },
  { path: '/admin/models', component: AdminModels, name: 'AdminModels' },
  { path: '/admin/body-types', component: AdminBodyTypes, name: 'AdminBodyTypes' },
  { path: '/admin/transmissions', component: AdminTransmissions, name: 'AdminTransmissions' },
  { path: '/admin/fuel-types', component: AdminFuelTypes, name: 'AdminFuelTypes' },
  { path: '/admin/colours', component: AdminColours, name: 'AdminColours' },
  
  // Admin redirect
  { path: '/admin', redirect: '/admin/listings' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})