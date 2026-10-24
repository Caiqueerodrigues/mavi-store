<template>
  <div class="splash" role="status" aria-label="Carregando o sistema">
    <div class="splash-skeleton">
      <div class="skeleton-center-brand">
        <img src="/assets/logo-mavi.png" alt="Mavi Store" />
      </div>
      <aside class="skeleton-sidebar">
        <div class="skeleton-brand">
          <i class="skeleton-block brand-mark"></i>
          <i class="skeleton-block brand-name"></i>
        </div>
        <i v-for="item in 6" :key="item" class="skeleton-block skeleton-nav"></i>
      </aside>
      <main class="skeleton-main">
        <div class="skeleton-topbar">
          <i class="skeleton-block topbar-title"></i>
          <i class="skeleton-block topbar-user"></i>
        </div>
        <div class="skeleton-heading">
          <i class="skeleton-block heading-title"></i>
          <i class="skeleton-block heading-action"></i>
        </div>
        <div class="skeleton-stats">
          <div v-for="item in 4" :key="item" class="skeleton-stat">
            <i class="skeleton-block stat-label"></i>
            <i class="skeleton-block stat-value"></i>
            <i class="skeleton-block stat-foot"></i>
          </div>
        </div>
        <div class="skeleton-panels">
          <div class="skeleton-panel">
            <i class="skeleton-block panel-title"></i>
            <i class="skeleton-block chart-bar chart-bar-one"></i>
            <i class="skeleton-block chart-bar chart-bar-two"></i>
            <i class="skeleton-block chart-bar chart-bar-three"></i>
            <i class="skeleton-block panel-foot"></i>
          </div>
          <div class="skeleton-panel">
            <i class="skeleton-block panel-title"></i>
            <i v-for="item in 4" :key="item" class="skeleton-block panel-row">
              <i class="skeleton-block row-dot"></i>
              <i class="skeleton-block row-line"></i>
              <i class="skeleton-block row-value"></i>
            </i>
          </div>
        </div>
      </main>
    </div>
    <span class="sr-only">Preparando seu ambiente…</span>
  </div>
</template>
