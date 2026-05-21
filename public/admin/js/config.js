// Configuración de URLs
// Para desarrollo local: http://localhost:3000
// Para producción con Railway: reemplazar con https://tu-proyecto.railway.app

const getAPIURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Reemplazar esto con tu URL de Railway cuando esté listo
  // Formato: https://cartanew-lacatedral-v2.railway.app
  const RAILWAY_URL = window.__RAILWAY_API_URL__ || 'https://cartanew-lacatedral-v2.railway.app';
  
  return RAILWAY_URL;
};

const API_URL = getAPIURL();
