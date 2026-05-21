const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : window.location.origin;

let token = null;

function initAuth() {
  token = sessionStorage.getItem('auth_token');

  if (token) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('dashboardScreen').classList.remove('active');
}

function showDashboard() {
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('dashboardScreen').classList.add('active');
  loadGallery('local');
  loadMenu();
}

async function handleLogin(event) {
  event.preventDefault();

  const pin = document.getElementById('pinInput').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });

    if (!response.ok) {
      throw new Error('PIN inválido');
    }

    const data = await response.json();
    token = data.token;
    sessionStorage.setItem('auth_token', token);

    document.getElementById('pinInput').value = '';
    showDashboard();
  } catch (error) {
    errorEl.textContent = 'Error: ' + error.message;
    errorEl.style.display = 'block';
  }
}

function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    token = null;
    sessionStorage.removeItem('auth_token');
    showLogin();
  }
}

function getAuthHeader() {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', initAuth);
