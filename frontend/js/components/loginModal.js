/*
  FILE: loginModal.js

  What does this file do?
  Renders the pop-up window to log in or create a new account. It's a
  floating window, not a whole new screen, so the person doesn't lose
  track of where they were before opening it (e.g. if they were looking
  at search results, they still see those same results after closing it).
*/

// Opens the login/register window. "initialTab" decides whether it
// opens showing the login form or the create-account form first
function openLoginModal(initialTab = 'login') {
  closeLoginModal(); // in case one was already open, close it first

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'login-modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="login-close-btn">✕</button>
      <div class="tabs">
        <div class="tab" id="tab-login" data-i18n="auth.loginCta">Iniciar sesión</div>
        <div class="tab" id="tab-register" data-i18n="auth.registerCta">Crear cuenta</div>
      </div>
      <div id="login-form-container"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('login-close-btn').addEventListener('click', closeLoginModal);
  document.getElementById('tab-login').addEventListener('click', () => renderLoginTab());
  document.getElementById('tab-register').addEventListener('click', () => renderRegisterTab());

  initialTab === 'login' ? renderLoginTab() : renderRegisterTab();
}

// Closes (removes from the screen) the login/register window
function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.remove();
}

// Renders the "Log in" form (email + password)
function renderLoginTab() {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');

  const container = document.getElementById('login-form-container');
  container.innerHTML = `
    <form id="login-form">
      <div class="form-group">
        <label data-i18n="auth.email">Correo electrónico</label>
        <input type="email" id="login-email" required>
      </div>
      <div class="form-group">
        <label data-i18n="auth.password">Contraseña</label>
        <input type="password" id="login-password" required>
      </div>
      <div class="form-error hidden" id="login-error"></div>
      <button type="submit" class="btn btn-primary btn-block" data-i18n="auth.loginCta">Iniciar sesión</button>
    </form>
  `;
  applyTranslations();

  // What happens when the person clicks "Log in"
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // prevents the form from reloading the page, like old-school forms do
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');

    try {
      await loginUser(email, password);
      closeLoginModal();
      renderNavbar();
      showToast('¡Bienvenido de nuevo!');
      renderCurrentRoute();
    } catch (error) {
      // If the email or password is wrong, show the error message here
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
    }
  });
}

// Renders the "Create account" form (name, email, phone, password, etc.)
function renderRegisterTab() {
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');

  const container = document.getElementById('login-form-container');
  container.innerHTML = `
    <form id="register-form">
      <div class="form-group" data-field="firstName">
        <label data-i18n="auth.firstName">Nombre</label>
        <input type="text" id="reg-firstName">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="lastName">
        <label data-i18n="auth.lastName">Apellido</label>
        <input type="text" id="reg-lastName">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="email">
        <label data-i18n="auth.email">Correo electrónico</label>
        <input type="email" id="reg-email">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="phone">
        <label data-i18n="auth.phone">Teléfono</label>
        <input type="tel" id="reg-phone" placeholder="3001234567">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="password">
        <label data-i18n="auth.password">Contraseña</label>
        <input type="password" id="reg-password">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="confirmPassword">
        <label data-i18n="auth.confirmPassword">Confirmar contraseña</label>
        <input type="password" id="reg-confirmPassword">
        <div class="form-error hidden"></div>
      </div>
      <div class="form-group" data-field="acceptTerms">
        <label style="display:flex; align-items:center; gap:8px; font-weight:400;">
          <input type="checkbox" id="reg-acceptTerms" style="width:auto;">
          <span data-i18n="auth.acceptTerms">Acepto los Términos y Condiciones y la Política de Datos</span>
        </label>
        <div class="form-error hidden"></div>
      </div>
      <button type="submit" class="btn btn-primary btn-block" data-i18n="auth.registerCta">Crear cuenta</button>
    </form>
  `;
  applyTranslations();

  document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
}

// Runs when the person clicks "Create account".
// First checks that every field is filled in correctly (validation),
// and only if everything is correct, sends the data to the server
async function handleRegisterSubmit(e) {
  e.preventDefault();

  const formData = {
    firstName: document.getElementById('reg-firstName').value,
    lastName: document.getElementById('reg-lastName').value,
    email: document.getElementById('reg-email').value,
    phone: document.getElementById('reg-phone').value,
    password: document.getElementById('reg-password').value,
    confirmPassword: document.getElementById('reg-confirmPassword').value,
    acceptTerms: document.getElementById('reg-acceptTerms').checked
  };

  // Before validating again, clear any error messages left from a previous attempt
  document.querySelectorAll('#register-form .form-group').forEach((group) => {
    group.classList.remove('has-error');
    group.querySelector('.form-error').classList.add('hidden');
  });

  const { isValid, errors } = validateRegisterForm(formData);

  // If any field is wrong, show the error right under that field and stop
  if (!isValid) {
    Object.entries(errors).forEach(([field, message]) => {
      const group = document.querySelector(`[data-field="${field}"]`);
      if (group) {
        group.classList.add('has-error');
        const errorEl = group.querySelector('.form-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      }
    });
    return;
  }

  // If everything is fine, send the data to the server to create the account
  try {
    await registerUser(formData);
    showToast('Cuenta creada. Ahora inicia sesión');
    renderLoginTab();
  } catch (error) {
    showToast(error.message);
  }
}
