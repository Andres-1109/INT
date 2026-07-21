/*
  FILE: i18n.js

  What does this file do?
  It's what lets the page switch between Spanish and English (and back)
  without reloading the screen, when the user clicks the ES/EN button.

  How does it work, in simple terms?
  We have two "dictionaries" stored in separate files: one in Spanish
  (es.json) and one in English (en.json). Every piece of text on the
  page has a "code" (e.g. "nav.login"). When the user switches language,
  this file looks up each text's code in the matching dictionary and
  swaps what's shown on screen.
*/

const LANG_STORAGE_KEY = 'wspace_lang';
let currentTranslations = {};
let currentLang = 'es';

// Downloads the dictionary for the requested language (es.json or
// en.json) and makes it ready to use
async function loadLanguage(lang) {
  const response = await fetch(`/i18n/${lang}.json`);
  currentTranslations = await response.json();
  currentLang = lang;

  // We save the chosen language in the browser's storage, so the next
  // time the user visits, the page remembers their preference
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  document.documentElement.setAttribute('lang', lang);

  applyTranslations();
  window.dispatchEvent(new Event('wspace:languageChanged'));
}

// Looks up the translation for a single piece of text (used inside JS
// code, not in the HTML)
function t(key) {
  return currentTranslations[key] || key;
}

// Scans the whole page looking for text marked for translation, and replaces it
function applyTranslations() {
  // Finds every element tagged data-i18n="something" and changes its text
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (currentTranslations[key]) {
      el.textContent = currentTranslations[key];
    }
  });

  // Same idea, but for the placeholder text shown inside form fields
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (currentTranslations[key]) {
      el.setAttribute('placeholder', currentTranslations[key]);
    }
  });
}

// Returns the currently active language ("es" or "en")
function getCurrentLang() {
  return currentLang;
}

// Runs once, when the page first loads: checks whether the user had
// already picked a language before, and defaults to Spanish if not
async function initI18n() {
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY) || 'es';
  await loadLanguage(savedLang);
}

// Runs when the user clicks the language toggle button (ES/EN)
async function toggleLanguage() {
  const nextLang = currentLang === 'es' ? 'en' : 'es';
  await loadLanguage(nextLang);
}
