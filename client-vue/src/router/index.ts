import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useWaveStore } from '@/stores/wave'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const waveStore = useWaveStore()
      const lastWave = waveStore.activeWaves[waveStore.activeWaves.length - 1]
      return lastWave ? `/wave/${lastWave._id}` : '/waves'
    }
  },
  {
    path: '/waves',
    name: 'waves',
    component: () => import('@/views/WavesView.vue')
  },
  {
    path: '/wave/:id',
    name: 'wave',
    component: () => import('@/views/WaveView.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const waveStore = useWaveStore()
  
  // Update current wave when navigating
  if (to.name === 'wave' && typeof to.params.id === 'string') {
    waveStore.setCurrentWave(to.params.id)
  } else if (to.name !== 'wave') {
    waveStore.setCurrentWave(null)
  }
  
  next()
})

export default router

