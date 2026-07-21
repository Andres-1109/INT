/*
  FILE: footer.js

  What does this file do?
  Renders the footer (the strip at the very bottom) that appears on
  every screen, with links to the legal documents.
*/

function renderFooter() {
  const footerContainer = document.getElementById('footer');
  footerContainer.innerHTML = `
    <div class="footer">
      <p>© 2026 WSPACE — Riwi Integrator Project</p>
      <div class="mt-md">
        <a href="/about" data-link data-i18n="footer.about">Sobre nosotros</a>
        <a href="/terms" data-link data-i18n="footer.terms">Términos y condiciones</a>
        <a href="/privacy-policy" data-link data-i18n="footer.privacy">Política de datos</a>
      </div>
    </div>
  `;
}
