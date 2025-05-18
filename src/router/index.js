import { createRouter, createWebHistory } from 'vue-router'

import Home from '../pages/Home.vue'
import Listings from '../pages/Listings.vue'
import Listing from '../pages/Listing.vue'
import ListingCreation from '../pages/ListingCreation.vue'
import About from '../pages/About.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/listings', component: Listings },
  { path: '/listings/:id', component: Listing },
  { path: '/create', component: ListingCreation },
  { path: '/about', component: About }
]



export const router = createRouter({
  history: createWebHistory(),
  routes
})
