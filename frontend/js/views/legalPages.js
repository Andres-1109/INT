/*
  FILE: legalPages.js

  What does this file do?
  Renders the Terms and Conditions and Privacy Policy pages. This only
  holds a short summary to keep the page light; the full legal text
  lives in the WSPACE_Terminos_y_Politica_Datos.md file. If the team
  wants to show the full text within the page (instead of just a
  summary), it can be pasted right here.
*/

function renderLegalTermsView(container) {
  container.innerHTML = `
    <div class="container section" style="max-width:720px;">
      <h1 class="section-title">Términos y Condiciones</h1>
      <p>WSPACE es una plataforma tecnológica que actúa como intermediaria entre
      personas que ofrecen espacios físicos por horas (WSpacer+) y personas que
      desean reservarlos (WSpacer). WSPACE no es propietaria, arrendadora ni
      administradora de los espacios publicados.</p>
      <p class="mt-md">El texto completo de este documento está disponible en el
      archivo <code>WSPACE_Terminos_y_Politica_Datos.md</code> del repositorio.</p>
    </div>
  `;
}

function renderLegalPrivacyView(container) {
  container.innerHTML = `
    <div class="container section" style="max-width:720px;">
      <h1 class="section-title">Política de Tratamiento de Datos Personales</h1>
      <p>Conforme a la Ley 1581 de 2012, el titular de los datos tiene derecho a
      conocer, actualizar, rectificar y solicitar la supresión de su información
      personal en cualquier momento.</p>
      <p class="mt-md">El texto completo de este documento está disponible en el
      archivo <code>WSPACE_Terminos_y_Politica_Datos.md</code> del repositorio.</p>
    </div>
  `;
}
