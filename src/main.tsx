import React from 'react';
import ReactDOM from 'react-dom/client';
import AppContent from './App';
import { StudyProvider } from './context/StudyContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudyProvider>
      <AppContent />
    </StudyProvider>
  </React.StrictMode>
);
