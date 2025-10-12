import React from 'react';
import ReactDOM from 'react-dom/client';
import ConfidenceMonitor from './ConfidenceMonitor.jsx';
import './confidence.css';
import './lyric-transitions.css'; // Import transition effects

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfidenceMonitor />
  </React.StrictMode>,
);
