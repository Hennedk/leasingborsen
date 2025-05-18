<template>
  <BaseLayout>
    <!-- Hero banner with background image and overlay -->
    <section
      class="hero min-h-[60vh] bg-cover bg-center mb-12"
      style="background-image: url('https://images.unsplash.com/photo-1507358522600-9f71e620c44e');"
    >
      <div class="hero-overlay bg-opacity-60"></div>
      <div class="hero-content text-neutral-content text-center">
        <div class="max-w-xl">
          <h1 class="text-4xl font-bold mb-6 leading-tight">
            This is a test
          </h1>
          <div class="flex gap-4 justify-center flex-wrap">
            <button class="btn btn-primary">Overtag leasing</button>
            <button class="btn btn-secondary">Afslut leasing</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Cars section -->
    <section class="max-w-screen-xl mx-auto px-4 pb-12">
      <h2 class="text-2xl font-bold mb-6">Nyeste leasingbiler</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Card 1 -->
        <div class="card bg-base-100 shadow-md border border-base-200">
          <figure>
            <img src="https://source.unsplash.com/featured/?renault,zoe" alt="Renault Zoe" class="w-full h-48 object-cover" />
          </figure>
          <div class="card-body">
            <h3 class="card-title text-lg">Renault Zoe</h3>
            <p class="text-sm text-gray-500">2.500 kr/md – 16 mdr. tilbage</p>
            <p class="text-sm text-gray-400">Automatisk • El • 2021 • 30.000 km</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Se mere</button>
            </div>
          </div>
        </div>

        <!-- Card 2 -->
        <div class="card bg-base-100 shadow-md border border-base-200">
          <figure>
            <img src="https://source.unsplash.com/featured/?ford,kuga" alt="Ford Kuga" class="w-full h-48 object-cover" />
          </figure>
          <div class="card-body">
            <h3 class="card-title text-lg">Ford Kuga</h3>
            <p class="text-sm text-gray-500">2.900 kr/md – 14 mdr. tilbage</p>
            <p class="text-sm text-gray-400">Plug-in Hybrid • 2022 • 22.000 km</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Se mere</button>
            </div>
          </div>
        </div>

        <!-- Card 3 -->
        <div class="card bg-base-100 shadow-md border border-base-200">
          <figure>
            <img src="https://source.unsplash.com/featured/?skoda,enyaq" alt="Skoda Enyaq" class="w-full h-48 object-cover" />
          </figure>
          <div class="card-body">
            <h3 class="card-title text-lg">Skoda Enyaq</h3>
            <p class="text-sm text-gray-500">3.400 kr/md – 20 mdr. tilbage</p>
            <p class="text-sm text-gray-400">El • 2023 • 12.000 km</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Se mere</button>
            </div>
          </div>
        </div>

        <!-- Card 4 -->
        <div class="card bg-base-100 shadow-md border border-base-200">
          <figure>
            <img src="https://source.unsplash.com/featured/?mercedes,a250e" alt="Mercedes A250e" class="w-full h-48 object-cover" />
          </figure>
          <div class="card-body">
            <h3 class="card-title text-lg">Mercedes A250e</h3>
            <p class="text-sm text-gray-500">3.700 kr/md – 18 mdr. tilbage</p>
            <p class="text-sm text-gray-400">Plug-in Hybrid • 2022 • 18.000 km</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Se mere</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </BaseLayout>
</template>

<script setup>
import BaseLayout from '../components/BaseLayout.vue'
</script>
