import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource-variable/inter';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { SportProvider } from './sport/SportContext';
import { initTheme } from './theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SportProvider>
      <App />
    </SportProvider>
  </React.StrictMode>
);
