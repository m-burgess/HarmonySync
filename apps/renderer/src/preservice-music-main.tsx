import React from 'react';
import { createRoot } from 'react-dom/client';
import PreserviceMusicWindow from './components/screens/PreserviceMusicWindow.jsx';
import './styles/App.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PreserviceMusicWindow />
  </React.StrictMode>
);
