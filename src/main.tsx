import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Bridge dipasang paling awal: seluruh panggilan /api/* diarahkan ke backend
// Google Apps Script (spreadsheet aktif) bila aplikasi di-deploy lewat Apps Script.
import {installArmsApiBridge} from './lib/gasBridge';
import App from './App.tsx';
import './index.css';
import './components/assignment-letter/letter-generator.css';

installArmsApiBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
