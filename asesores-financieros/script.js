// ====== Ajustes: cambia estos datos por los de tu asesoría ======
const WHATSAPP = "573000000000"; // número con código de país, sin + ni espacios

// Header con sombra al hacer scroll
const header = document.querySelector(".header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll);
onScroll();

// Menú móvil
const nav = document.querySelector(".nav");
document.querySelector(".menu-toggle").addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

// Enlace activo según la sección
const links = [...nav.querySelectorAll("a:not(.btn)")];
const sections = links.map(a => document.querySelector(a.getAttribute("href")));
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
sections.forEach(s => s && spy.observe(s));

// Aparecer al hacer scroll
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Contadores animados
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now();
  const tick = t => {
    const p = Math.min((t - t0) / 1600, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  cio.unobserve(el);
}), { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach(el => cio.observe(el));

// Fondo animado: velas/barras que suben con partículas
(() => {
  const c = document.getElementById("bg-chart"), ctx = c.getContext("2d");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let w, h, pts;
  const init = () => {
    w = c.width = c.offsetWidth; h = c.height = c.offsetHeight;
    pts = Array.from({ length: Math.round(w / 28) }, () => ({ x: Math.random() * w, y: Math.random() * h, v: .2 + Math.random() * .5, r: 1 + Math.random() * 2 }));
  };
  init(); addEventListener("resize", init);
  const loop = () => {
    ctx.clearRect(0, 0, w, h);
    pts.forEach(p => {
      p.y -= p.v; if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      ctx.fillStyle = "rgba(125,180,255,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < 110) { ctx.strokeStyle = `rgba(125,180,255,${.18 * (1 - d / 110)})`; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
    }
    requestAnimationFrame(loop);
  };
  loop();
})();

// Inclinación 3D del panel con el mouse
const vis = document.querySelector(".hero-visual"), dash = document.querySelector(".dash");
vis.addEventListener("mousemove", e => {
  const r = vis.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  dash.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
});
vis.addEventListener("mouseleave", () => dash.style.transform = "");

// WhatsApp
const waMsg = txt => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`;
document.getElementById("wa").href = waMsg("Hola, quisiera solicitar una asesoría financiera.");
document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (!f.get("nombre").trim() || !f.get("tel").trim()) return alert("Escribe tu nombre y teléfono.");
  open(waMsg(`Hola, soy ${f.get("nombre")} (${f.get("tel")}). ${f.get("msg") || "Quisiera solicitar una asesoría financiera."}`), "_blank");
});

document.getElementById("y").textContent = new Date().getFullYear();
