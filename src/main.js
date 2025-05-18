import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router' // 👉 import your router
import './assets/main.css'

createApp(App)
  .use(router) // 👉 register the router
  .mount('#app')
