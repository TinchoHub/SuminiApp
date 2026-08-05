import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AgendarTurno from './pages/AgendarTurno';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Ruta Principal: Dashboard de Compras/Depósito */}
        <Route path="/" element={<App />} />

        {/* Ruta Pública: Portal del Proveedor para agendar turno */}
        <Route path="/agendar/:token" element={<AgendarTurno />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);