/* ==========================================================
   WebZipe — interacciones del sitio
   ========================================================== */
(function () {
  "use strict";

  var T = function (s) { return window.wzT ? window.wzT(s) : s; };
  var html = document.documentElement;
  var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Bloqueo de scroll (sin mover la página) ---------- */
  var bloqueos = 0;
  function bloquear() { bloqueos++; html.classList.add("bloqueado"); }
  function desbloquear() {
    bloqueos = Math.max(0, bloqueos - 1);
    if (!bloqueos) html.classList.remove("bloqueado");
  }

  /* ---------- WhatsApp: cada contacto va al azar a uno de los dos números ---------- */
  var NUMEROS_WA = ["573102363531", "573117453436"];
  window.wzWaNumber = function () {
    return NUMEROS_WA[Math.floor(Math.random() * NUMEROS_WA.length)];
  };
  function armarWa(a) {
    var msg = a.getAttribute("data-wa");
    a.href = "https://wa.me/" + window.wzWaNumber() + "?text=" + encodeURIComponent(T(msg));
  }
  document.querySelectorAll("[data-wa]").forEach(armarWa);
  // Justo antes de abrir el enlace se vuelve a sortear el número y se usa el idioma actual
  ["click", "auxclick"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var a = e.target.closest && e.target.closest("a[data-wa]");
      if (a) armarWa(a);
    }, true);
  });

  /* ---------- Barra de anuncios ---------- */
  var mensajes = document.querySelectorAll(".anuncio-msg");
  if (mensajes.length > 1 && !reducirMovimiento) {
    var iMsg = 0;
    setInterval(function () {
      mensajes[iMsg].classList.remove("is-on");
      iMsg = (iMsg + 1) % mensajes.length;
      mensajes[iMsg].classList.add("is-on");
    }, 4200);
  }

  /* ---------- Menú lateral ---------- */
  var menu = document.getElementById("menuLateral");
  var velo = document.getElementById("veloMenu");
  var btnAbrir = document.getElementById("abrirMenu");
  var btnCerrar = document.getElementById("cerrarMenu");

  function abrirMenu() {
    velo.hidden = false;
    requestAnimationFrame(function () { velo.classList.add("visible"); });
    menu.classList.add("abierto");
    menu.setAttribute("aria-hidden", "false");
    btnAbrir.setAttribute("aria-expanded", "true");
    bloquear();
    btnCerrar.focus();
  }
  function cerrarMenu(devolverFoco) {
    if (!menu.classList.contains("abierto")) return;
    velo.classList.remove("visible");
    menu.classList.remove("abierto");
    menu.setAttribute("aria-hidden", "true");
    btnAbrir.setAttribute("aria-expanded", "false");
    setTimeout(function () { velo.hidden = true; }, 300);
    desbloquear();
    if (devolverFoco) btnAbrir.focus();
  }
  btnAbrir.addEventListener("click", abrirMenu);
  btnCerrar.addEventListener("click", function () { cerrarMenu(true); });
  velo.addEventListener("click", function () { cerrarMenu(true); });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { cerrarMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarMenu(true);
  });
  menu.querySelectorAll(".sub-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var sub = document.getElementById(b.getAttribute("aria-controls"));
      var abierto = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!abierto));
      sub.hidden = abierto;
    });
  });

  /* ---------- Bienvenida: fotos de páginas que van rotando ---------- */
  (function () {
    var caja = document.getElementById("inicio");
    if (!caja) return;
    var fotos = caja.querySelectorAll(".bienvenida-fotos li");
    var puntos = caja.querySelectorAll(".bienvenida-puntos button");
    var actual = 0, timer = null;

    function ir(n) {
      fotos[actual].classList.remove("is-on");
      puntos[actual].classList.remove("is-on");
      actual = (n + fotos.length) % fotos.length;
      fotos[actual].classList.add("is-on");
      puntos[actual].classList.add("is-on");
      seguir();
    }
    function seguir() {
      clearTimeout(timer);
      if (!reducirMovimiento) timer = setTimeout(function () { ir(actual + 1); }, 6000);
    }
    caja.querySelectorAll("[data-paso]").forEach(function (b) {
      b.addEventListener("click", function () { ir(actual + Number(b.getAttribute("data-paso"))); });
    });
    puntos.forEach(function (p, i) { p.addEventListener("click", function () { ir(i); }); });

    var x0 = null;
    caja.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    caja.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimeout(timer); else seguir();
    });
    seguir();
  })();

  /* ---------- Vistas previas de proyectos ----------
     Cada tarjeta carga la página de muestra en un iframe escalado. */
  (function () {
    var galeria = document.getElementById("galeria");
    if (!galeria) return;
    var fotos = galeria.querySelectorAll(".producto-foto");
    function escalar() {
      fotos.forEach(function (f) {
        if (f.clientWidth) f.style.setProperty("--escala", (f.clientWidth / 390).toFixed(4));
      });
    }
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(escalar);
      fotos.forEach(function (f) { ro.observe(f); });
    }
    window.addEventListener("resize", escalar);
    // Se cargan la primera vez que se abre el letrero de proyectos
    var dlg = document.getElementById("letrero-proyectos");
    function cargar() {
      galeria.querySelectorAll("iframe[data-src]").forEach(function (f) {
        if (!f.src) f.src = f.getAttribute("data-src");
      });
      requestAnimationFrame(escalar);
    }
    if (dlg) dlg.addEventListener("wz-abierto", cargar);
  })();

  /* ---------- Botones de plan: llevan al formulario con el plan elegido ---------- */
  document.querySelectorAll("[data-plan]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = document.getElementById("f-plan");
      if (sel) sel.value = a.getAttribute("data-plan");
    });
  });

  /* ---------- Aparecer al hacer scroll ---------- */
  var animables = document.querySelectorAll("main .titulo-seccion, main .plan");
  if (!reducirMovimiento && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visto"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    animables.forEach(function (el) { el.classList.add("aparece"); obs.observe(el); });
  }

  /* ---------- Letreros (sobre nosotros, trabaja aquí y documentos legales) ---------- */
  var letreroLegal = document.getElementById("letrero-legal");

  function abrirLetrero(dlg) {
    if (!dlg || dlg.open) return;
    cerrarMenu(false);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    bloquear();
    var cuerpo = dlg.querySelector(".letrero-cuerpo");
    if (cuerpo) cuerpo.scrollTop = 0;
    dlg.dispatchEvent(new Event("wz-abierto"));
  }
  document.querySelectorAll("dialog.letrero").forEach(function (dlg) {
    dlg.addEventListener("close", desbloquear);
    // Clic fuera de la caja = cerrar
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
    dlg.querySelectorAll("[data-cerrar]").forEach(function (b) {
      b.addEventListener("click", function () { dlg.close(); });
    });
    // Un enlace a otra parte de la página (ej. "Conocer más" → planes) cierra el letrero
    dlg.querySelectorAll('a[href^="#"]:not([data-wa])').forEach(function (a) {
      a.addEventListener("click", function () { dlg.close(); });
    });
  });

  function mostrarDoc(nombre) {
    letreroLegal.querySelectorAll("[role=tab]").forEach(function (t) {
      t.setAttribute("aria-selected", String(t.getAttribute("data-doc") === nombre));
    });
    letreroLegal.querySelectorAll("article[data-doc]").forEach(function (a) {
      a.hidden = a.getAttribute("data-doc") !== nombre;
    });
    letreroLegal.querySelector(".legal-texto").scrollTop = 0;
  }

  document.addEventListener("click", function (e) {
    var abre = e.target.closest("[data-abrir]");
    if (abre) {
      e.preventDefault();
      abrirLetrero(document.getElementById("letrero-" + abre.getAttribute("data-abrir")));
      return;
    }

    var legal = e.target.closest("[data-legal]");
    if (legal) {
      e.preventDefault();
      mostrarDoc(legal.getAttribute("data-legal"));
      abrirLetrero(letreroLegal);
      return;
    }

    var tab = e.target.closest("[data-doc][role=tab], [data-doc-ir]");
    if (tab) mostrarDoc(tab.getAttribute("data-doc") || tab.getAttribute("data-doc-ir"));
  });

  // Enlaces viejos (legal/terminos.html, etc.) llegan como #legal-terminos
  var hashLegal = /^#legal-(terminos|privacidad|cookies|retracto)$/.exec(location.hash);
  if (hashLegal) {
    mostrarDoc(hashLegal[1]);
    abrirLetrero(letreroLegal);
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ---------- Cookies y autorizaciones (Ley 1581 de 2012) ----------
     wz-consent es lo único necesario: guarda la elección.
     El idioma (wz-lang) solo se guarda si la persona lo acepta.
     Cada elección queda registrada en Supabase como prueba. */
  var SUPABASE_URL = "https://jsllxsbfkwaxdxstheew.supabase.co";
  var SUPABASE_KEY = "sb_publishable_IjIg-Yrdel6tjR6D4t5rpA__PW_RDLp"; // clave pública por diseño
  var VERSION = window.wzConsentVersion || "1.1";

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function rpc(fn, cuerpo, opciones) {
    opciones = opciones || {};
    return fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      keepalive: !!opciones.keepalive,
      signal: opciones.signal,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      body: JSON.stringify(cuerpo)
    });
  }
  window.wzLogConsent = function (o) {
    return rpc("log_consent", {
      p_consent_id: o.id, p_kind: o.kind, p_choice: o.choice, p_policy_version: VERSION,
      p_email: o.email || null, p_reservation_id: o.reservationId || null,
      p_user_agent: navigator.userAgent, p_page_url: location.href.split("#")[0]
    }, { keepalive: true }).then(function (r) { return r.ok; }, function () { return false; });
  };

  (function () {
    var aviso = document.getElementById("avisoCookies");
    var config = document.getElementById("ckConfig");
    var check = document.getElementById("ckPreferencias");
    var btnAjustes = document.getElementById("ckAjustes");
    var btnGuardar = document.getElementById("ckGuardar");
    var btnRechazar = document.getElementById("ckRechazar");
    var btnAceptar = document.getElementById("ckAceptar");
    var btnPie = document.getElementById("abrirCookies");

    function guardarLocal(reg) { try { localStorage.setItem("wz-consent", JSON.stringify(reg)); } catch (e) {} }
    function registrar(reg) {
      window.wzLogConsent({ id: reg.id, kind: "cookies", choice: { necessary: true, preferences: !!reg.prefs } })
        .then(function (ok) { if (ok) { reg.logged = true; guardarLocal(reg); } });
    }
    function aplicar(prefs) {
      try {
        if (prefs) localStorage.setItem("wz-lang", window.wzIdioma ? window.wzIdioma() : "es");
        else localStorage.removeItem("wz-lang");
        localStorage.removeItem("wz-theme"); // de la versión anterior del sitio
      } catch (e) {}
    }
    function verConfig(si) {
      config.hidden = !si;
      btnGuardar.hidden = !si;
      btnAjustes.setAttribute("aria-expanded", String(si));
    }
    function mostrar(conConfig) {
      var c = window.wzConsentRead();
      check.checked = !!(c && c.prefs);
      verConfig(!!conConfig);
      aviso.hidden = false;
    }
    function guardar(prefs) {
      var reg = { v: VERSION, ts: Date.now(), prefs: !!prefs, id: uuid(), logged: false };
      guardarLocal(reg);
      aplicar(!!prefs);
      aviso.hidden = true;
      registrar(reg);
    }

    btnAjustes.addEventListener("click", function () { verConfig(config.hidden); });
    btnAceptar.addEventListener("click", function () { guardar(true); });
    btnRechazar.addEventListener("click", function () { guardar(false); });
    btnGuardar.addEventListener("click", function () { guardar(check.checked); });
    btnPie.addEventListener("click", function () { mostrar(true); btnGuardar.focus(); });

    var actual = window.wzConsentRead();
    if (!actual) { aplicar(false); mostrar(false); }
    else if (!actual.logged) registrar(actual);
  })();

  /* ---------- Formulario: guarda en Supabase y abre WhatsApp ----------
     La base de datos asigna al azar uno de los dos números del equipo. */
  (function () {
    var form = document.getElementById("formCotizar");
    if (!form) return;
    var msg = document.getElementById("f-msg");
    var enviar = document.getElementById("f-enviar");
    var claveIdem = null; // evita solicitudes duplicadas por doble clic
    var enviando = false;

    form.addEventListener("input", function () { claveIdem = null; });

    function aviso(tipo, texto) {
      msg.hidden = false;
      msg.className = "form-msg" + (tipo === "error" ? " error" : "");
      msg.textContent = texto;
    }

    function guardarSolicitud(datos) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
      return rpc("create_reservation", datos, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          clearTimeout(t);
          return res.json().then(function (body) {
            if (!res.ok) throw new Error((body && body.message) || ("HTTP " + res.status));
            var fila = Array.isArray(body) ? body[0] : body;
            if (!fila || !fila.assigned_phone) throw new Error("SIN_ASIGNAR");
            return fila;
          });
        }, function (err) { clearTimeout(t); throw err; });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (enviando) return;

      var nombre = form.nombre.value.trim();
      var telTexto = form.telefono.value.trim();
      var email = form.email.value.trim();
      var plan = form.plan.value;
      var fecha = form.fecha.value;
      var hora = form.hora.value;
      var telefono = (telTexto.charAt(0) === "+" ? "+" : "") + telTexto.replace(/\D/g, "");

      if (nombre.length < 2 || !/^\+?[0-9]{7,15}$/.test(telefono) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !plan) {
        aviso("error", T("Escribe tu nombre, un número de WhatsApp válido, un correo válido y elige un plan."));
        return;
      }
      // Ley 1581: autorización previa, expresa e informada, en casillas separadas
      if (!document.getElementById("f-terminos").checked || !document.getElementById("f-privacidad").checked) {
        aviso("error", T("Para continuar, acepta los términos y autoriza el tratamiento de tus datos."));
        return;
      }

      var interes = plan === "Aún no estoy seguro"
        ? T("Aún no sé qué plan elegir y me gustaría asesoría.")
        : T("Me interesa el") + " " + T(plan) + ".";
      var texto = T("Hola, soy") + " " + nombre + ". " + interes + " " +
        T("Mi WhatsApp es") + " " + telTexto + " " + T("y mi correo es") + " " + email + ".";
      if (fecha || hora) texto += " " + T("Me gustaría agendar para el") + " " + [fecha, hora].filter(Boolean).join(" ") + ".";
      texto += " " + T("¿Me pueden enviar más información?");

      // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee
      var ventana = window.open("", "_blank");
      if (ventana) { try { ventana.opener = null; } catch (err) {} }

      if (!claveIdem) claveIdem = uuid();
      enviando = true;
      enviar.disabled = true;
      aviso("ok", T("Guardando tu solicitud…"));

      guardarSolicitud({
        p_customer_name: nombre,
        p_phone: telefono,
        p_email: email,
        p_reservation_date: fecha || null,
        p_reservation_time: hora || null,
        p_request_type: plan,
        p_message: texto,
        p_idempotency_key: claveIdem
      }).then(function (fila) {
        return { numero: String(fila.assigned_phone).replace(/\D/g, ""), ref: fila.reservation_id };
      }, function (err) {
        // Si la base de datos no responde, igual llega a uno de los dos números
        if (window.console) console.warn("[WebZipe] No se pudo guardar la solicitud:", err && err.message);
        return { numero: window.wzWaNumber(), ref: null };
      }).then(function (r) {
        window.wzLogConsent({
          id: claveIdem, kind: "form",
          choice: { terms: true, privacy: true, notice: true },
          email: email, reservationId: r.ref || null
        });
        var final = r.ref ? texto + " (" + T("Solicitud") + " #" + String(r.ref).slice(0, 8) + ")" : texto;
        var url = "https://wa.me/" + r.numero + "?text=" + encodeURIComponent(final);
        if (ventana && !ventana.closed) ventana.location.href = url;

        aviso("ok", T("Te estamos llevando a WhatsApp con tus datos… Si no se abre,") + " ");
        var respaldo = document.createElement("a");
        respaldo.href = url;
        respaldo.target = "_blank";
        respaldo.rel = "noopener";
        respaldo.textContent = T("haz clic aquí");
        respaldo.style.textDecoration = "underline";
        msg.appendChild(respaldo);
        msg.appendChild(document.createTextNode("."));
      }).then(function () {
        enviando = false;
        enviar.disabled = false;
      });
    });
  })();

  /* ---------- Año del pie ---------- */
  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();

})();
