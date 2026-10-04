// ====== Ajustes: cambia estos datos por los de tu asesoría ======
const WHATSAPP = "573000000000"; // número con código de país, sin + ni espacios

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ====== Header, barra de progreso y botón "arriba" ======
const header = $(".header");
const progress = $(".progress");
const toTop = $(".to-top");
const onScroll = () => {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  header.classList.toggle("scrolled", y > 10);
  progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  toTop.classList.toggle("show", y > 700);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ====== Menú móvil ======
const toggle = $(".menu-toggle");
const nav = $(".nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
$$("a", nav).forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));

// ====== Enlace activo según la sección visible ======
const navLinks = $$(".nav a");
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
navLinks.forEach(a => { const s = $(a.getAttribute("href")); if (s) sectionObserver.observe(s); });

// ====== Animación al aparecer (con efecto escalonado) ======
$$(".service-grid, .benefit-grid, .steps, .hero-copy").forEach(group => {
  $$(".reveal", group).forEach((el, i) => el.style.setProperty("--d", `${i * 0.12}s`));
});
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("visible");
    $$(".count", e.target).forEach(countUp);
    revealObserver.unobserve(e.target);
  });
}, { threshold: 0.15 });
$$(".reveal").forEach(el => revealObserver.observe(el));

// ====== Contadores animados ======
function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const to = Number(el.dataset.to);
  if (reduceMotion) { el.textContent = to; return; }
  const start = performance.now();
  const dur = 1800;
  const tick = now => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// Los contadores de las tarjetas flotantes del hero
setTimeout(() => $$(".float-card .count").forEach(countUp), 900);

// ====== Efecto 3D (tilt) y botón magnético ======
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (finePointer && !reduceMotion) {
  $$(".tilt").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
  $$(".magnetic").forEach(btn => {
    btn.addEventListener("pointermove", e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
  // Parallax suave de los orbes del hero
  const orbs = $$(".orb");
  $(".hero").addEventListener("pointermove", e => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    orbs.forEach((o, i) => { o.style.translate = `${x * (i + 1) * 30}px ${y * (i + 1) * 30}px`; });
  });
}

// ====== Simulador de ahorro ======
const monthly = $("#monthly"), years = $("#years"), rate = $("#rate");
const money = n => "$" + Math.round(n).toLocaleString("es-CO");
function setFill(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty("--fill", `${pct}%`);
}
function simulate() {
  const m = Number(monthly.value), y = Number(years.value), r = Number(rate.value) / 100 / 12;
  const months = y * 12;
  const points = [];
  let total = 0;
  for (let i = 0; i <= months; i++) {
    if (i > 0) total = total * (1 + r) + m;
    if (i % 12 === 0 || i === months) points.push({ total, paid: m * i });
  }
  const paid = m * months;
  $("#outMonthly").textContent = money(m);
  $("#outYears").textContent = y;
  $("#outRate").textContent = rate.value;
  $("#simTotal").textContent = money(total);
  $("#simPaid").textContent = money(paid);
  $("#simGain").textContent = money(total - paid);
  [monthly, years, rate].forEach(setFill);

  // Gráfico
  const W = 300, H = 140, pad = 8;
  const maxV = Math.max(total, 1);
  const px = i => (i / (points.length - 1 || 1)) * W;
  const py = v => H - pad - (v / maxV) * (H - pad * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(p.total).toFixed(1)}`).join(" ");
  const paidLine = points.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(p.paid).toFixed(1)}`).join(" ");
  $("#simLine").setAttribute("d", line);
  $("#simPaidLine").setAttribute("d", paidLine);
  $("#simArea").setAttribute("d", `${line} L${W} ${H} L0 ${H} Z`);
}
[monthly, years, rate].forEach(i => i.addEventListener("input", simulate));
simulate();

// ====== Slider de testimonios ======
const slides = $(".slides");
const dotsWrap = $(".slider-dots");
const total = slides.children.length;
let current = 0, timer;
for (let i = 0; i < total; i++) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "tab");
  b.setAttribute("aria-label", `${i + 1} / ${total}`);
  b.addEventListener("click", () => { go(i); restart(); });
  dotsWrap.appendChild(b);
}
function go(i) {
  current = (i + total) % total;
  slides.style.transform = `translateX(calc(${-current * 100}% - ${current * 8}px))`;
  $$("button", dotsWrap).forEach((d, j) => d.setAttribute("aria-selected", j === current));
}
function restart() { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(current + 1), 6000); }
go(0); restart();
let touchX = null;
slides.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
slides.addEventListener("touchend", e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
  touchX = null;
});

// ====== Formulario → WhatsApp ======
const form = $("#contactForm");
const formMsg = $("#formMsg");
form.addEventListener("submit", e => {
  e.preventDefault();
  let ok = true;
  ["#fName", "#fPhone", "#fService"].forEach(id => {
    const el = $(id);
    const bad = !el.value.trim();
    el.closest(".field").classList.toggle("invalid", bad);
    if (bad) ok = false;
  });
  if (!ok) {
    formMsg.className = "form-msg";
    formMsg.textContent = t("Por favor completa tu nombre, teléfono y el servicio.");
    return;
  }
  const lines = [
    t("Hola, quiero solicitar una asesoría financiera."),
    `${t("Nombre")}: ${$("#fName").value.trim()}`,
    `${t("Teléfono")}: ${$("#fPhone").value.trim()}`,
    `${t("Servicio")}: ${$("#fService").selectedOptions[0].textContent}`,
  ];
  const msg = $("#fMsg").value.trim();
  if (msg) lines.push(`${t("Objetivo")}: ${msg}`);
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  formMsg.className = "form-msg ok";
  formMsg.textContent = t("¡Gracias! Te estamos redirigiendo a WhatsApp.");
  form.reset();
});

// ====== Enlaces de WhatsApp ======
$$("[data-wa]").forEach(a => {
  a.href = `https://wa.me/${WHATSAPP}`;
  a.target = "_blank";
  a.rel = "noopener";
});

// Año del footer
$$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

// ====== Traducción (Español / English) ======
const EN = {
  "Lunes a viernes · 8:00 a. m. – 6:00 p. m.": "Monday to Friday · 8:00 a.m. – 6:00 p.m.",
  "Asesoría financiera": "Financial advisory",
  "Sobre la asesoría": "About us",
  "Servicios": "Services",
  "Beneficios": "Benefits",
  "Clientes": "Clients",
  "Contacto": "Contact",
  "Solicitar asesoría": "Book a consultation",
  "Cambiar idioma": "Change language",
  "Abrir menú": "Open menu",
  "Escríbenos por WhatsApp": "Message us on WhatsApp",
  "Volver arriba": "Back to top",
  "Tu bienestar financiero es nuestra prioridad": "Your financial well-being is our priority",
  "Toma las mejores": "Make the best",
  "decisiones con": "decisions with",
  "tu dinero": "your money",
  "Te ayudamos a organizar tus finanzas, establecer objetivos y construir un plan adaptado a tus necesidades.": "We help you organize your finances, set goals and build a plan tailored to your needs.",
  "Ver servicios": "See services",
  "familias asesoradas": "families advised",
  "años de experiencia": "years of experience",
  "clientes satisfechos": "satisfied clients",
  "Ahorro anual": "Annual savings",
  "Meta: vivienda propia": "Goal: owning a home",
  "Organización financiera": "Financial organization",
  "Planificación": "Planning",
  "Control de gastos": "Expense control",
  "Metas financieras": "Financial goals",
  "Protección familiar": "Family protection",
  "Tu plan financiero": "Your financial plan",
  "En curso": "In progress",
  "Necesidades": "Needs",
  "Estilo de vida": "Lifestyle",
  "Ahorro e inversión": "Savings & investing",
  "Un acompañamiento cercano para que tu dinero trabaje para ti": "Close guidance so your money works for you",
  "En Tu Futuro ofrecemos asesoría financiera para personas de todo tipo, ayudándoles a gestionar sus finanzas y alcanzar sus objetivos.": "At Tu Futuro we offer financial advice to all kinds of people, helping them manage their finances and reach their goals.",
  "Te acompañamos a construir un futuro financiero más sólido, proteger a tu familia y conocer las alternativas más adecuadas para tus objetivos, con atención cercana y personalizada.": "We help you build a stronger financial future, protect your family and find the options best suited to your goals, with close, personalized attention.",
  "\"No trabajes toda la vida por dinero, haz que tu dinero trabaje toda la vida por ti.\"": "\"Don't work your whole life for money; make your money work for you your whole life.\"",
  "Agenda tu primera cita": "Book your first meeting",
  "Soluciones financieras": "Financial solutions",
  "para cada etapa de tu vida": "for every stage of your life",
  "Ofrecemos servicios diseñados para ayudarte a organizar tus finanzas, alcanzar tus metas y tomar decisiones con mayor seguridad.": "Our services are designed to help you organize your finances, reach your goals and make decisions with more confidence.",
  "Analizamos tus ingresos y gastos para ayudarte a establecer una estructura financiera clara.": "We analyze your income and expenses to help you set up a clear financial structure.",
  "Planificación financiera": "Financial planning",
  "Define objetivos financieros y crea un plan para alcanzarlos con mayor seguridad.": "Set financial goals and create a plan to reach them with more confidence.",
  "Identifica tus principales gastos y encuentra oportunidades para administrar mejor tus recursos.": "Identify your main expenses and find ways to manage your resources better.",
  "Convierte tus objetivos en pasos concretos y medibles, con un plan adaptado a ti.": "Turn your goals into concrete, measurable steps with a plan made for you.",
  "¿Por qué elegir Tu Futuro?": "Why choose Tu Futuro?",
  "Más que números: te damos claridad, tranquilidad y un camino concreto hacia tus metas.": "More than numbers: we give you clarity, peace of mind and a concrete path to your goals.",
  "Atención personalizada": "Personalized attention",
  "Un asesor dedicado que conoce tu situación y te acompaña en cada decisión.": "A dedicated advisor who knows your situation and supports every decision.",
  "Protección para tu familia": "Protection for your family",
  "Te ayudamos a prever imprevistos y a proteger lo que más quieres.": "We help you prepare for the unexpected and protect what you love most.",
  "Información clara": "Clear information",
  "Explicamos cada alternativa en palabras sencillas, sin letra pequeña.": "We explain every option in plain words, with no fine print.",
  "Seguimiento constante": "Ongoing follow-up",
  "Revisamos tu plan periódicamente y lo ajustamos a medida que cambian tus metas.": "We review your plan regularly and adjust it as your goals change.",
  "Así trabajamos contigo": "How we work with you",
  "Diagnóstico": "Assessment",
  "Conocemos tus ingresos, gastos, deudas y sueños.": "We learn about your income, expenses, debts and dreams.",
  "Plan a tu medida": "A plan made for you",
  "Diseñamos una estrategia realista con metas claras.": "We design a realistic strategy with clear goals.",
  "Acción": "Action",
  "Te guiamos paso a paso para ponerlo en marcha.": "We guide you step by step to put it in motion.",
  "Seguimiento": "Follow-up",
  "Medimos tu avance y celebramos cada logro.": "We track your progress and celebrate every win.",
  "Simulador de ahorro": "Savings simulator",
  "Descubre cuánto puede crecer tu dinero": "See how much your money can grow",
  "Mueve los controles y mira cómo un hábito de ahorro constante se convierte en un gran resultado. Es solo una estimación ilustrativa.": "Move the sliders and watch a steady saving habit turn into a great result. This is only an illustrative estimate.",
  "Ahorro mensual": "Monthly savings",
  "Tiempo": "Time",
  "años": "years",
  "Rentabilidad anual estimada": "Estimated annual return",
  "Podrías acumular": "You could build up",
  "Tus aportes": "Your contributions",
  "Rendimientos": "Returns",
  "Quiero un plan como este": "I want a plan like this",
  "Personas que ya están construyendo su futuro": "People already building their future",
  "\"Por primera vez sé exactamente a dónde va mi dinero. En seis meses pagué mis tarjetas y empecé a ahorrar.\"": "\"For the first time I know exactly where my money goes. In six months I paid off my cards and started saving.\"",
  "Docente": "Teacher",
  "\"Nos ayudaron a armar un plan para la cuota inicial de nuestra casa. La atención fue cercana y muy clara.\"": "\"They helped us put together a plan for our home down payment. The service was warm and very clear.\"",
  "Familia": "Family",
  "\"Como independiente nunca sabía cuánto separar. Ahora tengo un fondo de emergencia y metas medibles.\"": "\"As a freelancer I never knew how much to set aside. Now I have an emergency fund and measurable goals.\"",
  "Emprendedor": "Entrepreneur",
  "Da el primer paso hacia tu tranquilidad financiera": "Take the first step toward financial peace of mind",
  "Cuéntanos qué quieres lograr y un asesor te contactará para agendar tu primera cita sin costo.": "Tell us what you want to achieve and an advisor will contact you to book your first free meeting.",
  "Nombre completo": "Full name",
  "Teléfono / WhatsApp": "Phone / WhatsApp",
  "¿En qué te podemos ayudar?": "How can we help you?",
  "Cuéntanos tu objetivo (opcional)": "Tell us your goal (optional)",
  "Solicitar asesoría por WhatsApp": "Request a consultation on WhatsApp",
  "Tu bienestar financiero es nuestra prioridad.": "Your financial well-being is our priority.",
  "Sitio de ejemplo diseñado por": "Example site designed by",
  "Por favor completa tu nombre, teléfono y el servicio.": "Please fill in your name, phone and the service.",
  "Hola, quiero solicitar una asesoría financiera.": "Hi, I'd like to request a financial consultation.",
  "Nombre": "Name",
  "Teléfono": "Phone",
  "Servicio": "Service",
  "Objetivo": "Goal",
  "¡Gracias! Te estamos redirigiendo a WhatsApp.": "Thank you! We're taking you to WhatsApp.",
  "Tu Futuro | Asesoría financiera": "Tu Futuro | Financial advisory",
};
let lang = "es";
try { lang = localStorage.getItem("tf-lang") || "es"; } catch (_) {}
const t = s => (lang === "en" ? EN[s] || s : s);
const textEls = $$("[data-t]").map(el => ({ el, es: el.textContent.trim() }));
const ariaEls = $$("[data-t-aria]");
const docTitle = document.title;
const langBtn = $(".lang-btn");
function applyLang() {
  document.documentElement.lang = lang;
  textEls.forEach(({ el, es }) => { el.textContent = t(es); });
  ariaEls.forEach(el => el.setAttribute("aria-label", t(el.dataset.tAria)));
  document.title = t(docTitle);
  langBtn.textContent = lang === "es" ? "EN" : "ES";
}
langBtn.addEventListener("click", () => {
  lang = lang === "es" ? "en" : "es";
  try { localStorage.setItem("tf-lang", lang); } catch (_) {}
  applyLang();
});
applyLang();
