<template>
  <div class="card bg-base-100 border border-base-300 shadow-sm rounded-lg">
    <div class="card-body p-4">
      <h3 class="font-semibold text-base-content mb-3">
        <slot name="title" />
      </h3>
      <div>
        <slot name="content" />
      </div>
    </div>
  </div>
</template> 