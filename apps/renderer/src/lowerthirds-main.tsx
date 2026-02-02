import React from 'react';
import ReactDOM from 'react-dom/client';
import LowerThirdsScreen from './components/screens/LowerThirdsScreen.jsx';
import './styles/lowerthirds.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LowerThirdsScreen />
  </React.StrictMode>
);