import { createHashRouter, Navigate } from 'react-router-dom'
import App from './App'
import WaveView from './views/WaveView'
import WavesView from './views/WavesView'

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/waves" replace />
      },
      {
        path: 'waves',
        element: <WavesView />
      },
      {
        path: 'wave/:id',
        element: <WaveView />
      }
    ]
  }
])

