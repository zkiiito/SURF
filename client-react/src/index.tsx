import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'
import WaveStore from './store/WaveStore'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const store = new WaveStore()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App store={store} />,

    children: [
      {
        path: '/',
      },
      {
        path: 'wave/:waveId',
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
