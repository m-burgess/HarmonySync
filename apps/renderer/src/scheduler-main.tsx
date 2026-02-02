import React from 'react';
import { createRoot } from 'react-dom/client';
import SchedulerWindow from './components/screens/SchedulerWindow.jsx';
import './styles/App.css';
import './styles/vscode-theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SchedulerWindow />
  </React.StrictMode>
);
