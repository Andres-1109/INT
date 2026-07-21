/*
  FILE: utils.js

  What does this file do?
  Here we keep small "tools" that are used in many different parts of
  the page, so we don't have to write the same code multiple times.
  It also holds the lists of space categories and amenities (wifi,
  drum kit, parking, etc.) used across several views.
*/

// Turns a number (e.g. 45000) into a nicely formatted price (e.g. $45.000)
function formatPrice(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

// Shows a small message that appears at the bottom of the screen for a
// few seconds and then disappears (e.g. "Booking sent" or "Couldn't save")
function showToast(message, duration = 3000) {
  let toastEl = document.getElementById('toast');

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('show');

  setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// Checks whether an email address is well-formed (has an @ and a dot
// after it, for example)
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Checks that the phone number has exactly 10 digits
function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

// Reads whatever comes after the "?" in the URL and turns it into
// something easy to use. Example: if the URL is "/spaces?type=office",
// this returns { type: "office" }
function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// Does the opposite of the function above: builds a URL with filters.
// Example: buildUrlWithParams("/spaces", { type: "office" }) returns "/spaces?type=office"
function buildUrlWithParams(path, params) {
  const filteredParams = Object.entries(params).filter(([_, value]) => value !== '' && value != null);
  const query = new URLSearchParams(Object.fromEntries(filteredParams)).toString();
  return query ? `${path}?${query}` : path;
}

// Formats the time left until a deadline (an ISO date string) as "Xh Ym".
// Returns null once the deadline has already passed, so callers can show
// a different message (e.g. "Deadline expired") instead of a negative time.
function formatTimeRemaining(deadlineIso) {
  const msLeft = new Date(deadlineIso).getTime() - Date.now();
  if (msLeft <= 0) return null;

  const totalMinutes = Math.floor(msLeft / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// Checks whether a booking's date+endTime is already in the past, by
// combining a "YYYY-MM-DD" date string with an "HH:MM" time string
function isPastDateTime(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const end = new Date(dateStr);
  end.setHours(hours, minutes, 0, 0);
  return end.getTime() <= Date.now();
}

// Calculates how many hours there are between a start time and an end time.
// Example: calculateHours("14:00", "16:30") returns 2.5 (two and a half hours)
function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

// The 5 space categories WSPACE offers, with their name in Spanish,
// in English, and an icon to display on screen
const CATEGORY_LABELS = {
  private_office: { es: 'Oficina privada', en: 'Private office', icon: '🏢' },
  meeting_room: { es: 'Sala de juntas', en: 'Meeting room', icon: '🧑\u200d🤝\u200d🧑' },
  coworking: { es: 'Coworking', en: 'Coworking', icon: '💻' },
  creative_space: { es: 'Espacio creativo', en: 'Creative space', icon: '🎨' },
  rehearsal_room: { es: 'Sala de ensayo musical', en: 'Music rehearsal room', icon: '🎸' }
};

// Indicates which amenities make sense to show depending on the space
// type. For example, an office might have "coffee", while a music
// rehearsal room might instead have "drum kit" or "amplifier"
const AMENITIES_BY_CATEGORY = {
  private_office: ['wifi', 'projector', 'whiteboard', 'coffee', 'parking', 'air_conditioning'],
  meeting_room: ['wifi', 'projector', 'whiteboard', 'coffee', 'parking'],
  coworking: ['wifi', 'coffee', 'lockers', 'natural_light'],
  creative_space: ['soundproofing', 'pro_lighting', 'vocal_booth', 'green_screen'],
  rehearsal_room: ['drum_kit', 'amplifier', 'microphone', 'soundproofing', 'mixing_console']
};

// Name and icon for each individual amenity, in Spanish and English
const AMENITY_LABELS = {
  wifi: { es: 'Wifi', en: 'Wifi', icon: '📶' },
  projector: { es: 'Proyector', en: 'Projector', icon: '📽️' },
  whiteboard: { es: 'Pizarra', en: 'Whiteboard', icon: '🖊️' },
  coffee: { es: 'Punto de café', en: 'Coffee point', icon: '☕' },
  parking: { es: 'Parqueadero', en: 'Parking', icon: '🚗' },
  air_conditioning: { es: 'Aire acondicionado', en: 'Air conditioning', icon: '❄️' },
  lockers: { es: 'Lockers', en: 'Lockers', icon: '🔒' },
  natural_light: { es: 'Luz natural', en: 'Natural light', icon: '☀️' },
  soundproofing: { es: 'Insonorización', en: 'Soundproofing', icon: '🔇' },
  pro_lighting: { es: 'Iluminación profesional', en: 'Professional lighting', icon: '💡' },
  vocal_booth: { es: 'Cabina vocal', en: 'Vocal booth', icon: '🎙️' },
  green_screen: { es: 'Fondo croma', en: 'Green screen', icon: '🟩' },
  drum_kit: { es: 'Batería incluida', en: 'Drum kit included', icon: '🥁' },
  amplifier: { es: 'Amplificador', en: 'Amplifier', icon: '🔊' },
  microphone: { es: 'Micrófono', en: 'Microphone', icon: '🎤' },
  mixing_console: { es: 'Consola de mezcla', en: 'Mixing console', icon: '🎛️' }
};
