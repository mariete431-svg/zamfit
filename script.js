const $ = (s) => document.querySelector(s);
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Barra de arriba y progreso de lectura ----------
const nav = $("#nav");
const progreso = $("#progreso");
const parallax = matchMedia("(hover: hover) and (min-width: 861px)").matches ? document.querySelectorAll("[data-parallax]") : [];
let pendiente = false;
function alHacerScroll() {
  pendiente = false;
  nav.classList.toggle("scrolled", scrollY > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  progreso.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  if (reducido) return;
  parallax.forEach((img) => {
    const r = img.closest(".porque-foto, .empezar-fondo").getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const centro = r.top + r.height / 2 - innerHeight / 2;
    img.style.transform = `translateY(${centro * -+img.dataset.parallax}px)`;
  });
}
addEventListener("scroll", () => {
  if (!pendiente) requestAnimationFrame(alHacerScroll);
  pendiente = true;
}, { passive: true });
alHacerScroll();

// ---------- Menú móvil ----------
const menu = $("#menu");
const hamburguesa = $("#hamburguesa");
const resto = document.querySelectorAll("main, footer, .nav > .logo");
function cerrarMenu(devolverFoco = true) {
  if (!menu.classList.contains("abierto")) return;
  menu.classList.remove("abierto");
  hamburguesa.setAttribute("aria-expanded", "false");
  hamburguesa.setAttribute("aria-label", "Abrir menú");
  document.body.style.overflow = "";
  resto.forEach((el) => (el.inert = false));
  if (devolverFoco) hamburguesa.focus();
}
function abrirMenu() {
  menu.classList.add("abierto");
  hamburguesa.setAttribute("aria-expanded", "true");
  hamburguesa.setAttribute("aria-label", "Cerrar menú");
  document.body.style.overflow = "hidden";
  resto.forEach((el) => (el.inert = true));
  requestAnimationFrame(() => menu.querySelector("a").focus());
}
hamburguesa.addEventListener("click", () => (menu.classList.contains("abierto") ? cerrarMenu() : abrirMenu()));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => cerrarMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenu(); });
matchMedia("(min-width: 861px)").addEventListener("change", (e) => e.matches && cerrarMenu(false));

// ---------- Vídeo de portada ----------
// Se carga después de la página, en versión pequeña en el móvil, y nunca con "ahorro de datos" o "reducir movimiento"
const video = $("#video");
const ahorroDatos = navigator.connection && navigator.connection.saveData;
if (!reducido && !ahorroDatos) {
  addEventListener("load", () => {
    video.src = matchMedia("(max-width: 700px)").matches ? video.dataset.movil : video.dataset.escritorio;
    video.addEventListener("loadeddata", () => video.classList.add("listo"), { once: true });
    video.play().catch(() => {});
  });
}

// ---------- Aparecer al bajar ----------
const observador = new IntersectionObserver(
  (entradas) =>
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("visible");
      observador.unobserve(e.target);
    }),
  { threshold: 0.15 }
);
document.querySelectorAll(".aparecer").forEach((el) => {
  const hermanos = [...el.parentElement.children].filter((h) => h.classList.contains("aparecer"));
  el.style.setProperty("--retraso", (hermanos.indexOf(el) % 3) * 0.1 + "s");
  observador.observe(el);
});

// ---------- Contadores ----------
const contador = new IntersectionObserver((entradas) =>
  entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target, final = +el.dataset.contar, sufijo = el.dataset.sufijo || "", t0 = performance.now();
    const paso = (t) => {
      const p = Math.min((t - t0) / 1400, 1);
      el.textContent = Math.round(final * (1 - (1 - p) ** 3)) + sufijo;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    contador.unobserve(el);
  })
);
document.querySelectorAll("[data-contar]").forEach((el) => contador.observe(el));

// ---------- Horario ----------
const semana = {
  Lunes: [["07:00", "Fuerza"], ["09:30", "Movilidad"], ["18:00", "HIIT"], ["19:00", "Boxeo"], ["20:30", "Spinning"]],
  Martes: [["07:00", "Cross"], ["10:00", "Movilidad"], ["18:00", "Fuerza"], ["19:15", "Spinning"], ["20:30", "HIIT"]],
  Miércoles: [["07:00", "HIIT"], ["09:30", "Fuerza"], ["18:00", "Boxeo"], ["19:15", "Cross"], ["20:30", "Movilidad"]],
  Jueves: [["07:00", "Fuerza"], ["10:00", "Spinning"], ["18:00", "Cross"], ["19:15", "HIIT"], ["20:30", "Boxeo"]],
  Viernes: [["07:00", "Spinning"], ["09:30", "Cross"], ["17:30", "Fuerza"], ["19:00", "Boxeo"]],
  Sábado: [["09:00", "Cross"], ["10:30", "HIIT"], ["12:00", "Movilidad"]],
  Domingo: [["10:00", "Movilidad"], ["11:30", "Spinning"]],
};
const dias = Object.keys(semana);

// Día y minuto actuales en hora de Canarias
function ahoraCanarias() {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const v = (t) => partes.find((p) => p.type === t).value;
  return { dia: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(v("weekday")), min: (+v("hour") % 24) * 60 + +v("minute") };
}
const aMin = (h) => +h.slice(0, 2) * 60 + +h.slice(3);
const plazasOcupadas = (hora, clase) => 6 + ((aMin(hora) + clase.length * 7) % 6);

const ahora = ahoraCanarias();
const hoy = dias[ahora.dia];
const cajaDias = $("#dias");
const lista = $("#lista-horario");

function pintarDia(dia) {
  cajaDias.querySelectorAll(".dia").forEach((b) => {
    const activo = b.dataset.dia === dia;
    b.setAttribute("aria-selected", activo);
    b.tabIndex = activo ? 0 : -1;
    if (activo) lista.setAttribute("aria-labelledby", b.id);
  });
  lista.innerHTML = semana[dia]
    .map(([hora, clase], i) => `<li style="--i:${i}"><span class="hora">${hora}</span><span class="nombre-clase">${clase}</span><span class="coach">Ejemplo</span></li>`)
    .join("");
}
dias.forEach((d) => {
  const b = document.createElement("button");
  b.className = "dia";
  b.dataset.dia = d;
  b.id = "dia-" + dias.indexOf(d);
  b.setAttribute("role", "tab");
  b.setAttribute("aria-controls", "lista-horario");
  b.textContent = d === hoy ? `Hoy · ${d}` : d;
  b.addEventListener("click", () => pintarDia(d));
  cajaDias.appendChild(b);
});
pintarDia(hoy);
// Flechas, Inicio y Fin para moverse entre días
cajaDias.addEventListener("keydown", (e) => {
  const botones = [...cajaDias.querySelectorAll(".dia")];
  let i = botones.indexOf(document.activeElement);
  if (i < 0) return;
  if (e.key === "ArrowRight") i = (i + 1) % botones.length;
  else if (e.key === "ArrowLeft") i = (i - 1 + botones.length) % botones.length;
  else if (e.key === "Home") i = 0;
  else if (e.key === "End") i = botones.length - 1;
  else return;
  e.preventDefault();
  botones[i].focus();
  botones[i].click();
});
const botonHoy = cajaDias.querySelector(`[data-dia="${hoy}"]`);
cajaDias.scrollLeft = botonHoy.offsetLeft - cajaDias.offsetLeft - 8;

// ---------- Tarjeta "Próxima clase" ----------
(function proximaClase() {
  let siguiente = null;
  for (let d = 0; d < 7 && !siguiente; d++) {
    const indice = (ahora.dia + d) % 7;
    const clase = semana[dias[indice]].find(([h]) => d > 0 || aMin(h) > ahora.min);
    if (clase) siguiente = { d, dia: dias[indice], clase };
  }
  const [hora, nombre] = siguiente.clase;
  const ocupadas = plazasOcupadas(hora, nombre);
  let cuando = siguiente.d === 0 ? "Hoy" : siguiente.d === 1 ? "Mañana" : siguiente.dia;
  if (siguiente.d === 0) {
    const falta = aMin(hora) - ahora.min;
    cuando = falta < 60 ? `Empieza en ${falta} min` : "Hoy";
  }
  $("#proxima-cuando").textContent = `Próxima clase · ${cuando}`;
  $("#proxima-clase").textContent = nombre;
  $("#proxima-info").textContent = `${hora} · quedan ${12 - ocupadas} plazas`;
  document.querySelectorAll(".plazas i").forEach((p, i) => setTimeout(() => p.classList.toggle("ocupada", i < ocupadas), 1200 + i * 70));
})();

// ---------- Formulario (demo: no envía datos a ningún sitio) ----------
$("#formulario").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const avisoForm = $("#aviso");
  let bien = true;
  [f.nombre, f.email].forEach((campo) => {
    const ok = campo.value.trim() && campo.checkValidity();
    campo.classList.toggle("error", !ok);
    if (!ok) bien = false;
  });
  if (!bien) {
    avisoForm.className = "aviso mal";
    avisoForm.textContent = "Revisa tu nombre y tu email, por favor.";
    return;
  }
  avisoForm.className = "aviso";
  avisoForm.textContent = `¡Gracias, ${f.nombre.value.trim().split(" ")[0]}! Esto es una demo: todavía no se ha enviado nada.`;
  f.reset();
});
