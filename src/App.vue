              <template>
                <BaseLayout>
                  <h1 class="text-3xl font-bold mb-4">Welcome to Leasingbørsen</h1>
                  <p class="text-gray-500 mb-6">Find or list lease takeovers with ease.</p>

                    <div class="grid gap-6 grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))]">

                    <div class="card bg-base-100 shadow-md">
                      <div class="card-body">
                        <h2 class="card-title">VW ID.4</h2>
                        <p>3.200 kr/md – 18 mdr. tilbage</p>
                        <div class="card-actions justify-end">
                          <button class="btn btn-primary">Se mere</button>
                        </div>
                      </div>
                    </div>

                    <div class="card bg-base-100 shadow-md">
                      <div class="card-body">
                        <h2 class="card-title">Tesla Model Y</h2>
                        <p>4.100 kr/md – 12 mdr. tilbage</p>
                        <div class="card-actions justify-end">
                          <button class="btn btn-primary">Se mere</button>
                        </div>
                      </div>
                    </div>

                    <div class="card bg-base-100 shadow-md">
                      <div class="card-body">
                        <h2 class="card-title">BMW i3</h2>
                        <p>2.800 kr/md – 9 mdr. tilbage</p>
                        <div class="card-actions justify-end">
                          <button class="btn btn-primary">Se mere</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </BaseLayout>
              </template>

              <script setup>
              import BaseLayout from './components/BaseLayout.vue'
              </script>
