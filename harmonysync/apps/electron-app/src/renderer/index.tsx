// Renderer entrypoint scaffold (React)
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div>Electron App Renderer (placeholder)</div>;
}

const root = document.createElement('div');
document.body.appendChild(root);
createRoot(root).render(<App />);
