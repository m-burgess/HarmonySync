import React from 'react';
import { createRoot } from 'react-dom/client';
import SchedulerWindow from './components/screens/SchedulerWindow.jsx';
import './styles/App.css';
import './styles/vscode-theme.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SchedulerWindow />
  </React.StrictMode>
);
