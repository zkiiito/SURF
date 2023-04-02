import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import WaveStore from './WaveStore'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import WaveContainer from './WaveContainer'
import WaveContainerEmpty from './WaveContainerEmpty'

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
        element: <WaveContainer />,
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log)
