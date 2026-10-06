// ====== Ajustes: cambia estos datos por los de tu barbería ======
const WHATSAPP = "521234567890"; // número con código de país, sin + ni espacios
const INSTAGRAM = "https://instagram.com/"; // enlace a tu perfil de Instagram

// Header con fondo al hacer scroll
const header = document.querySelector(".header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll);
onScroll();

// Menú móvil
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => nav.classList.toggle("open"));
nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

// Animación al aparecer
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Enlaces de WhatsApp
document.querySelectorAll("[data-wa]").forEach(a => {
  a.href = `https://wa.me/${WHATSAPP}`;
  a.target = "_blank";
  a.rel = "noopener";
});

// Enlaces de Instagram
document.querySelectorAll("[data-ig]").forEach(a => {
  a.href = INSTAGRAM;
  a.target = "_blank";
  a.rel = "noopener";
});

// Año del footer
document.querySelectorAll("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

// ====== Traducción (Español / English) ======
const EN = {
  // Navegación y generales
  "Inicio": "Home",
  "Servicios": "Services",
  "Nosotros": "About",
  "Reseñas": "Reviews",
  "Reservar": "Book",
  "Traducción": "Translate",
  "Abrir menú": "Open menu",
  "Síguenos en Instagram": "Follow us on Instagram",
  "Escríbenos por WhatsApp": "Message us on WhatsApp",

  // Inicio
  "Barbería Clásica | Cortes, fades y barba": "Barbería Clásica | Haircuts, fades & beards",
  "Barbería de caballeros: fades, cortes clásicos, barba y afeitado con toalla caliente. Reserva tu cita.": "Gentlemen's barbershop: fades, classic cuts, beard care and hot-towel shaves. Book your appointment.",
  "Barbería de caballeros": "Gentlemen's barbershop",
  "Fade fresco,": "Fresh fade,",
  "look impecable.": "flawless look.",
  "Reserva tu silla antes de que se agote. Cortes precisos, barba perfilada y un ambiente hecho para relajarte.": "Book your chair before it's gone. Precise cuts, sharp beards and a place made for you to relax.",
  "Reservar cita": "Book appointment",
  "Ver servicios": "View services",
  "“Me encantó el servicio. La próxima vez vengo con mi esposo.”": "“I loved the service. Next time I'm bringing my husband.”",
  "Ver todas las reseñas →": "See all reviews →",

  "Nuestros servicios": "Our services",
  "El arte del": "The art of the",
  "buen corte": "perfect cut",
  "Cada servicio incluye lavado, asesoría de estilo y acabado con productos premium.": "Every service includes a wash, style advice and a finish with premium products.",
  "Corte clásico": "Classic cut",
  "Tijera y máquina, acabado a navaja": "Scissors and clippers, straight-razor finish",
  "Degradado a piel con diseño a medida": "Fade down to the skin with a custom design",
  "Arreglo de barba": "Beard trim",
  "Perfilado, recorte y aceite hidratante": "Shaping, trimming and moisturizing oil",
  "Afeitado tradicional": "Traditional shave",
  "Toalla caliente y navaja libre": "Hot towel and straight razor",
  "Corte + barba": "Cut + beard",
  "El servicio completo del caballero": "The complete gentleman's service",
  "Corte infantil": "Kids' cut",
  "Menores de 12 años": "Children under 12",

  "Barbero trabajando en la barbería": "Barber working in the barbershop",
  "Sobre nosotros": "About us",
  "Tradición, técnica y": "Tradition, technique and",
  "estilo": "style",
  "Somos una barbería dedicada al cuidado del caballero moderno. Combinamos las técnicas clásicas de la barbería tradicional con las tendencias actuales para darte un corte que habla por ti.": "We are a barbershop dedicated to caring for the modern gentleman. We combine classic barbering techniques with today's trends to give you a cut that speaks for you.",
  "Aquí no solo vienes a cortarte el cabello: vienes a tomarte un momento para ti, con buena música, buena plática y el cuidado que mereces.": "Here you don't just come for a haircut: you come to take a moment for yourself, with good music, good conversation and the care you deserve.",
  "Años de oficio": "Years of craft",
  "Clientes felices": "Happy clients",
  "Calificación": "Rating",

  "Reservaciones": "Reservations",
  "Aparta tu": "Save your",
  "silla": "chair",
  "Completa el formulario y confirmamos tu cita por WhatsApp.": "Fill out the form and we'll confirm your appointment on WhatsApp.",
  "Nombre": "Name",
  "Tu nombre": "Your name",
  "Servicio": "Service",
  "Fecha": "Date",
  "Hora": "Time",
  "Notas (opcional)": "Notes (optional)",
  "¿Algún estilo en mente?": "Any style in mind?",
  "Te responderemos en minutos para confirmar.": "We'll reply within minutes to confirm.",
  "Reservar por WhatsApp": "Book via WhatsApp",

  "Cortes de precisión y cuidado de barba para el caballero moderno.": "Precision cuts and beard care for the modern gentleman.",
  "Horario": "Hours",
  "Lun – Vie": "Mon – Fri",
  "Sábado": "Saturday",
  "Domingo": "Sunday",
  "Cerrado": "Closed",
  "Visítanos": "Visit us",
  "Col. Centro, Tu Ciudad": "Downtown, Your City",
  "Barbería Clásica · Todos los derechos reservados": "Barbería Clásica · All rights reserved",

  // Reseñas
  "Reseñas | Barbería Clásica": "Reviews | Barbería Clásica",
  "Lo que dicen nuestros clientes de Barbería Clásica.": "What our clients say about Barbería Clásica.",
  "Testimonios": "Testimonials",
  "Lo que dicen": "What",
  "nuestros clientes": "our clients say",
  "Tu opinión": "Your opinion",
  "Déjanos tu": "Leave us your",
  "reseña": "review",
  "¿Nos visitaste? Cuéntanos cómo te fue.": "Did you visit us? Tell us how it went.",
  "Comentario": "Comment",
  "Escribe tu experiencia…": "Write about your experience…",
  "Publicar reseña": "Post review",
  "Volver al inicio": "Back to home",
  "Por favor elige una calificación.": "Please choose a rating.",
  "¡Gracias por tu reseña!": "Thank you for your review!",
  "Me encantó el servicio. La próxima vez vengo con mi esposo, el ambiente es increíble.": "I loved the service. Next time I'm bringing my husband, the atmosphere is amazing.",
  "El mejor fade que me han hecho. Atención puntual, lugar impecable y muy buen trato.": "The best fade I've ever had. On time, spotless place and great service.",
  "El afeitado con toalla caliente vale cada peso. Salí como nuevo.": "The hot-towel shave is worth every penny. I walked out like new.",
  "Muy profesionales, cuidan cada detalle de la barba. Solo tuve que esperar unos minutos.": "Very professional, they take care of every detail of the beard. I only had to wait a few minutes.",
  "Traje a mi hijo por primera vez y lo trataron súper bien. Quedó feliz con su corte.": "I brought my son for the first time and they treated him really well. He loved his haircut.",
  "Llevo un año viniendo y nunca me han fallado. Recomendadísimo.": "I've been coming for a year and they've never let me down. Highly recommended."
};

const MONTHS = { enero: "January", febrero: "February", marzo: "March", abril: "April", mayo: "May", junio: "June", julio: "July", agosto: "August", septiembre: "September", octubre: "October", noviembre: "November", diciembre: "December" };

// Traduce un texto en español al inglés (diccionario + textos con números/fechas)
function toEnglish(str) {
  if (EN[str]) return EN[str];
  let m = str.match(/^(\d+) reseñas$/);
  if (m) return `${m[1]} reviews`;
  m = str.match(/^(\p{L}+) (?:de )?(\d{4})$/u);
  if (m && MONTHS[m[1].toLowerCase()]) return `${MONTHS[m[1].toLowerCase()]} ${m[2]}`;
  return null;
}

const originals = new WeakMap();
let currentLang = "es";
try { currentLang = localStorage.getItem("barber-lang") || "es"; } catch {}

function translateValue(original) {
  if (currentLang !== "en") return original;
  const key = original.trim();
  const en = key && toEnglish(key);
  return en ? original.replace(key, en) : original;
}

function applyLang() {
  document.documentElement.lang = currentLang;

  // Textos visibles
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest("script, style, svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  for (let n; (n = walker.nextNode());) {
    if (!originals.has(n)) originals.set(n, n.nodeValue);
    n.nodeValue = translateValue(originals.get(n));
  }

  // Atributos (placeholder, alt, aria-label) y meta descripción
  document.querySelectorAll("[placeholder], [alt], [aria-label], meta[name='description']").forEach(el => {
    ["placeholder", "alt", "aria-label", "content"].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `data-orig-${attr}`;
      if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(attr));
      el.setAttribute(attr, translateValue(el.getAttribute(key)));
    });
  });

  // Título de la pestaña
  if (!originals.has(document)) originals.set(document, document.title);
  document.title = translateValue(originals.get(document));

  document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.dataset.lang === currentLang));
}

// Botón "Traducción" y su menú
const lang = document.querySelector(".lang");
const langBtn = lang?.querySelector(".lang-btn");
const closeLang = () => { lang.classList.remove("open"); langBtn.setAttribute("aria-expanded", "false"); };

langBtn?.addEventListener("click", e => {
  e.stopPropagation();
  const open = lang.classList.toggle("open");
  langBtn.setAttribute("aria-expanded", String(open));
});
lang?.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => {
  currentLang = b.dataset.lang;
  try { localStorage.setItem("barber-lang", currentLang); } catch {}
  applyLang();
  closeLang();
}));
document.addEventListener("click", e => { if (lang && !lang.contains(e.target)) closeLang(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && lang) closeLang(); });

// ====== Reserva: envía los datos por WhatsApp ======
const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  const dateInput = bookingForm.querySelector('[name="fecha"]');
  dateInput.min = new Date().toISOString().split("T")[0];

  bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(bookingForm));
    const msg =
      `Hola, quiero reservar una cita:%0A` +
      `• Nombre: ${encodeURIComponent(d.nombre)}%0A` +
      `• Servicio: ${encodeURIComponent(d.servicio)}%0A` +
      `• Fecha: ${encodeURIComponent(d.fecha)}%0A` +
      `• Hora: ${encodeURIComponent(d.hora)}` +
      (d.notas ? `%0A• Notas: ${encodeURIComponent(d.notas)}` : "");
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, "_blank", "noopener,noreferrer");
  });
}

// ====== Reseñas ======
const DEFAULT_REVIEWS = [
  { name: "Karla Gómez", date: "Septiembre 2026", stars: 5, text: "Me encantó el servicio. La próxima vez vengo con mi esposo, el ambiente es increíble." },
  { name: "Luis Martínez", date: "Septiembre 2026", stars: 5, text: "El mejor fade que me han hecho. Atención puntual, lugar impecable y muy buen trato." },
  { name: "Andrés Ruiz", date: "Agosto 2026", stars: 5, text: "El afeitado con toalla caliente vale cada peso. Salí como nuevo." },
  { name: "Diego Herrera", date: "Agosto 2026", stars: 4, text: "Muy profesionales, cuidan cada detalle de la barba. Solo tuve que esperar unos minutos." },
  { name: "Sofía Castillo", date: "Julio 2026", stars: 5, text: "Traje a mi hijo por primera vez y lo trataron súper bien. Quedó feliz con su corte." },
  { name: "Jorge Ramírez", date: "Julio 2026", stars: 5, text: "Llevo un año viniendo y nunca me han fallado. Recomendadísimo." }
];

const reviewsGrid = document.getElementById("reviews-grid");

function loadReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem("barber-reviews") || "[]");
    return [...saved, ...DEFAULT_REVIEWS];
  } catch {
    return DEFAULT_REVIEWS;
  }
}

const starStr = n => { n = Math.min(5, Math.max(0, Math.floor(Number(n)) || 0)); return "★".repeat(n) + "☆".repeat(5 - n); };
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renderReviews() {
  const reviews = loadReviews();

  reviewsGrid.innerHTML = reviews.map(r => `
    <article class="review reveal visible">
      <div class="review-top"><span class="quote-mark">“</span><span class="stars">${starStr(r.stars)}</span></div>
      <p>${escapeHtml(r.text)}</p>
      <div class="review-author">
        <div class="avatar">${escapeHtml(r.name.charAt(0).toUpperCase())}</div>
        <div><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.date)}</small></div>
      </div>
    </article>`).join("");

  // Resumen de calificación
  const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
  document.getElementById("avg").textContent = avg.toFixed(1);
  document.getElementById("avg-stars").textContent = starStr(Math.round(avg));
  document.getElementById("count").textContent = `${reviews.length} reseñas`;
  document.getElementById("bars").innerHTML = [5, 4, 3, 2, 1].map(n => {
    const c = reviews.filter(r => r.stars === n).length;
    return `<div class="bar-row"><span>${n} ★</span><div class="bar"><i style="width:${(c / reviews.length) * 100}%"></i></div><span>${c}</span></div>`;
  }).join("");

  applyLang();
}

if (reviewsGrid) {
  renderReviews();

  const reviewForm = document.getElementById("review-form");
  reviewForm.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(reviewForm));
    const msg = document.getElementById("form-msg");
    if (!d.stars) { msg.textContent = "Por favor elige una calificación."; applyLang(); return; }

    const date = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const review = { name: d.nombre.trim(), text: d.comentario.trim(), stars: Number(d.stars), date: date.charAt(0).toUpperCase() + date.slice(1) };

    try {
      const saved = JSON.parse(localStorage.getItem("barber-reviews") || "[]");
      localStorage.setItem("barber-reviews", JSON.stringify([review, ...saved]));
    } catch {}

    reviewForm.reset();
    msg.textContent = "¡Gracias por tu reseña!";
    renderReviews();
    reviewsGrid.scrollIntoView({ behavior: "smooth" });
  });
}

// Aplica el idioma guardado al cargar
applyLang();
