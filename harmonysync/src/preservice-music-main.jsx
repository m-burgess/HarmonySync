import React from 'react';
import { createRoot } from 'react-dom/client';
import PreserviceMusicWindow from './components/screens/PreserviceMusicWindow.jsx';
import './styles/App.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PreserviceMusicWindow />
  </React.StrictMode>
);
