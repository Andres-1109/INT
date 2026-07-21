/*
  FILE: aboutPage.js

  What does this file do?
  Renders the "About WSPACE" page — a static marketing/info page (who we
  are, mission, vision, values, why-choose-us, stats, a closing CTA).
  Nothing here comes from the backend: the numbers in the stats section
  are intentionally aspirational marketing copy, not real database
  counts (confirmed with the team — this is a pitch page, not a metrics
  panel). Unlike legalPages.js, every piece of text here goes through
  the i18n system (data-i18n), since this page is meant to be shown
  during the ES/EN pitch, not just legal boilerplate.
*/

function renderAboutView(container) {
  container.innerHTML = `
    <section class="about-hero">
      <div class="container">
        <h1 data-i18n="about.heroTitle">Sobre WSPACE</h1>
        <p data-i18n="about.heroText">El espacio que necesitas, cuando lo necesitas. Creamos ambientes modernos para trabajar, innovar y crecer.</p>
      </div>
    </section>

    <div class="container section">

      <div class="about-card">
        <h2 data-i18n="about.whoTitle">¿Quiénes somos?</h2>
        <p data-i18n="about.whoText1">WSPACE es una plataforma especializada en el alquiler de espacios de coworking diseñada para emprendedores, estudiantes, empresas, freelancers y profesionales que necesitan un lugar cómodo, moderno y totalmente equipado para desarrollar sus actividades.</p>
        <p data-i18n="about.whoText2">Nuestro objetivo es conectar personas con espacios que inspiren productividad, creatividad y colaboración, ofreciendo una experiencia sencilla, segura y flexible para cada reserva.</p>
      </div>

      <div class="mission-grid">
        <div class="info-card">
          <div class="icon">🚀</div>
          <h2 data-i18n="about.missionTitle">Misión</h2>
          <p data-i18n="about.missionText">Brindar espacios de coworking modernos, accesibles y completamente equipados que permitan trabajar de manera cómoda, impulsar la innovación y fomentar la colaboración entre profesionales y empresas.</p>
        </div>
        <div class="info-card">
          <div class="icon">🌎</div>
          <h2 data-i18n="about.visionTitle">Visión</h2>
          <p data-i18n="about.visionText">Ser la plataforma líder en alquiler de espacios de coworking en Colombia, reconocida por la calidad de nuestros servicios, la innovación tecnológica y el fortalecimiento de comunidades emprendedoras.</p>
        </div>
      </div>

      <h2 class="about-section-title" data-i18n="about.valuesTitle">Nuestros Valores</h2>
      <div class="values-grid">
        <div class="value-card">
          <span class="value-icon">💡</span>
          <h3 data-i18n="about.valueInnovationTitle">Innovación</h3>
          <p data-i18n="about.valueInnovationText">Promovemos ideas nuevas y espacios que inspiran creatividad.</p>
        </div>
        <div class="value-card">
          <span class="value-icon">🤝</span>
          <h3 data-i18n="about.valueCollaborationTitle">Colaboración</h3>
          <p data-i18n="about.valueCollaborationText">Creemos en el trabajo conjunto para alcanzar mejores resultados.</p>
        </div>
        <div class="value-card">
          <span class="value-icon">⭐</span>
          <h3 data-i18n="about.valueQualityTitle">Calidad</h3>
          <p data-i18n="about.valueQualityText">Ofrecemos instalaciones modernas y un servicio de excelencia.</p>
        </div>
        <div class="value-card">
          <span class="value-icon">🌱</span>
          <h3 data-i18n="about.valueSustainabilityTitle">Sostenibilidad</h3>
          <p data-i18n="about.valueSustainabilityText">Impulsamos prácticas responsables con el medio ambiente.</p>
        </div>
        <div class="value-card">
          <span class="value-icon">🔒</span>
          <h3 data-i18n="about.valueTrustTitle">Confianza</h3>
          <p data-i18n="about.valueTrustText">Garantizamos procesos seguros y transparentes.</p>
        </div>
        <div class="value-card">
          <span class="value-icon">❤️</span>
          <h3 data-i18n="about.valueCommitmentTitle">Compromiso</h3>
          <p data-i18n="about.valueCommitmentText">Trabajamos para superar las expectativas de nuestros clientes.</p>
        </div>
      </div>

      <h2 class="about-section-title" data-i18n="about.whyTitle">¿Por qué elegir WSPACE?</h2>
      <div class="benefits-grid">
        <div class="benefit-card"><h3 data-i18n="about.benefitWifi">Internet de alta velocidad</h3></div>
        <div class="benefit-card"><h3 data-i18n="about.benefitCoffee">Café ilimitado</h3></div>
        <div class="benefit-card"><h3 data-i18n="about.benefitParking">Parqueadero</h3></div>
        <div class="benefit-card"><h3 data-i18n="about.benefitFlexible">Reservas flexibles</h3></div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h2>500+</h2>
          <p data-i18n="about.statsClients">Clientes felices</p>
        </div>
        <div class="stat-card">
          <h2>120+</h2>
          <p data-i18n="about.statsSpaces">Espacios disponibles</p>
        </div>
        <div class="stat-card">
          <h2>1000+</h2>
          <p data-i18n="about.statsBookings">Reservas realizadas</p>
        </div>
        <div class="stat-card">
          <h2>98%</h2>
          <p data-i18n="about.statsSatisfaction">Satisfacción</p>
        </div>
      </div>

      <div class="commitment">
        <h2 data-i18n="about.commitmentTitle">Nuestro compromiso</h2>
        <p data-i18n="about.commitmentText">En WSPACE creemos que el entorno donde trabajas puede transformar tus resultados. Por eso ofrecemos espacios diseñados para impulsar la productividad, la creatividad y el crecimiento profesional.</p>
        <a href="/spaces" data-link class="btn btn-secondary" data-i18n="about.exploreCta">Explorar espacios</a>
      </div>

      <section class="about-banner">
        <h2 data-i18n="about.bannerTitle">🚀 ¿Listo para trabajar en un espacio que impulse tus ideas?</h2>
        <p data-i18n="about.bannerText">Descubre oficinas privadas, salas de reuniones y espacios de coworking diseñados para ayudarte a alcanzar tus objetivos.</p>
        <a href="/spaces" data-link class="btn btn-secondary" data-i18n="about.exploreCta">Explorar espacios</a>
      </section>

    </div>
  `;
}
