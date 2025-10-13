/**
 * Main entry point for the TypeScript application
 */

import { App } from './App';
import './styles/index.less';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App('root');
  
  // Load test data in development mode
  if (import.meta.env.DEV) {
    app.loadTestData();
  }

  // Expose app to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).app = app;
  }
});
