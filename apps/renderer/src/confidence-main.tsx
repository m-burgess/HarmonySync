import React from 'react';
import ReactDOM from 'react-dom/client';
import ConfidenceMonitor from './components/screens/ConfidenceMonitor.jsx';
import './styles/confidence.css';
import './styles/lyric-transitions.css'; // Import transition effects

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ConfidenceMonitor />
  </React.StrictMode>,
);
