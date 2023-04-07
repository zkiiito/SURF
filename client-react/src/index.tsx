import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'
import WaveStore from './WaveStore'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import WaveContainerEmpty from './WaveContainerEmpty'
import WaveContainerProxy from './WaveContainerProxy'

const store = new WaveStore()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App store={store} />,

    children: [
      {
        path: '/',
        element: <WaveContainerEmpty />,
      },
      {
        path: 'wave/:waveId',
        element: <WaveContainerProxy waves={store.waves} />,
      },
    ],
  },
])

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
