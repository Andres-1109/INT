/*
  FILE: auth.js

  What does this file do?
  Everything related to "who is the user and can they get in": creating
  an account, logging in, logging out, and blocking access to a page
  that requires being logged in.

  What is the "token"?
  When someone logs in successfully, the server hands them a kind of
  "digital ID card" (the token). That card is stored in the browser's
  memory (localStorage) and we show it to the server every time we
  request something private (e.g. "my bookings"), so the server knows
  it's really us and not just anyone.

  Why store it in localStorage and not somewhere else?
  Because localStorage is shared across browser tabs. That's what lets
  the user open "host mode" in a new tab and have that tab already know
  who they are, without asking them to log in again.
*/

const TOKEN_KEY = 'wspace_token';
const USER_KEY = 'wspace_user';

// Sends the registration form data to the server to create a new account
async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo completar el registro');
  }

  return data;
}

// Sends email and password to the server. If they're correct, stores the
// "digital ID card" (token) and the user's data in the browser
async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Correo o contraseña incorrectos');
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data.user;
}

// Clears the digital ID card and the user's data, and sends them back
// to the Home page. This is what happens when someone clicks "Log out"
function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  navigateTo('/');
  showToast(t('nav.logout'));
}

// Returns the data of the currently logged-in user (name, email, role, etc.)
// without needing to ask the server again
function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Answers yes or no: is there anyone logged in right now?
function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

// Answers yes or no: is the current user a WSpacer+ (can they publish spaces)?
function isHost() {
  const user = getCurrentUser();
  return user && user.role === 'wspacer_plus';
}

// Answers yes or no: is the current user the platform admin?
function isAdmin() {
  const user = getCurrentUser();
  return user && user.systemRole === 'admin';
}

// Updates the stored user data (e.g. when someone upgrades from
// WSpacer to WSpacer+ after publishing their first space)
function updateStoredUser(newUserData) {
  localStorage.setItem(USER_KEY, JSON.stringify(newUserData));
}

// This function replaces the normal "fetch" for talking to the server,
// but automatically attaches the user's digital ID card (token).
// It's used in EVERY request that needs to know who the user is
// (my bookings, publish a space, approve a request, etc.)
async function authFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  // If the server responds "401" it means the card already expired or
  // is invalid. In that case, we log the user out automatically and
  // let them know
  if (response.status === 401) {
    logoutUser();
    showToast('Tu sesión expiró, inicia sesión de nuevo');
    throw new Error('No autenticado');
  }

  return response;
}

// Used before showing a private page (e.g. "my bookings").
// If the user is NOT logged in, instead of showing the page, we open
// the login window so they log in first
function requireAuth(renderCallback) {
  if (!isAuthenticated()) {
    openLoginModal();
    return;
  }
  renderCallback();
}

// Same as the function above, but also requires the user to have the
// WSpacer+ role (e.g. to view the host Dashboard)
function requireHostRole(renderCallback) {
  if (!isAuthenticated() || !isHost()) {
    showToast('Necesitas ser WSpacer+ para acceder a esta sección');
    navigateTo('/');
    return;
  }
  renderCallback();
}

// Same idea, but for the admin panel — only the seeded admin account
// (systemRole === 'admin') may see it
function requireAdminRole(renderCallback) {
  if (!isAuthenticated() || !isAdmin()) {
    showToast('Necesitas ser administrador para acceder a esta sección');
    navigateTo('/');
    return;
  }
  renderCallback();
}

// Checks that the registration form data is filled in correctly before
// sending it to the server. If something is wrong, returns the exact
// error message to show the user under the corresponding field
function validateRegisterForm(data) {
  const errors = {};

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = 'Ingresa tu nombre';
  }
  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.lastName = 'Ingresa tu apellido';
  }
  if (!isValidEmail(data.email)) {
    errors.email = 'Ingresa un correo válido';
  }
  if (!data.password || data.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }
  if (!isValidPhone(data.phone)) {
    errors.phone = 'Ingresa un teléfono válido (10 dígitos)';
  }
  if (!data.acceptTerms) {
    errors.acceptTerms = 'Debes aceptar los términos y condiciones';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
