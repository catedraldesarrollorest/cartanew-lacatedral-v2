// Configuración de URLs
// Para desarrollo local: http://localhost:3000
// Para producción en Railway: mismo dominio (raíz)

const getAPIURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  // En Railway, el admin y API están en el mismo dominio
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
};

const API_URL = getAPIURL();
