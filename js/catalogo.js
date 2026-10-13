// js/catalogo.js
// Lógica del catálogo público: pide los perfumes a la API del backend
// (que vive en OTRO repositorio/dominio — por eso la URL completa de abajo)
// por tandas (para no cargar las ~800 fragancias de una vez), y maneja el
// "carrito de selección" con tamaño (50/100 ml) para compartir por WhatsApp.
// Esta página es pura (HTML/CSS/JS estático): no requiere Node ni login.

// ⚠️ Cambia esto por la URL real de tu backend (el repositorio
// "rfragancias-admin") una vez que lo publiques.
const API_BASE_URL = "https://rfragancias.onrender.com";

document.getElementById("anio").textContent = new Date().getFullYear();

const grid = document.getElementById("grid-perfumes");
const contadorResultados = document.getElementById("contador-resultados");
const centinela = document.getElementById("centinela-scroll");
const buscador = document.getElementById("buscador");
const botonesGenero = document.querySelectorAll("#filtro-genero .pildora");

let generoActivo = "Todos";
let terminoBusqueda = "";
let temporizadorBusqueda = null;

const LIMITE_POR_TANDA = 24;
let desdeActual = 0;
let totalResultados = 0;
let hayMasPorCargar = true;
let cargandoTanda = false;
let ultimosPerfumes = []; // acumula todo lo cargado hasta ahora, para el carrito

const WHATSAPP_NUMERO = "573505737713";

const iconoFrasco = `
  <svg viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="4" width="16" height="10" rx="2" fill="currentColor"/>
    <rect x="27" y="14" width="10" height="6" fill="currentColor"/>
    <rect x="8" y="20" width="48" height="56" rx="6" fill="currentColor"/>
  </svg>`;

const iconoWhatsapp = `
  <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.7 4.607 1.909 6.472L4 29l7.723-1.867A11.94 11.94 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3Zm0 21.818c-1.94 0-3.75-.55-5.29-1.5l-.38-.226-4.583 1.108 1.13-4.47-.248-.398A9.79 9.79 0 0 1 5.182 15c0-5.966 4.853-10.818 10.819-10.818S26.818 9.034 26.818 15 21.966 24.818 16.001 24.818Zm5.978-8.129c-.328-.164-1.937-.955-2.237-1.065-.3-.109-.518-.164-.737.165-.219.328-.845 1.064-1.036 1.283-.19.219-.382.246-.71.082-.328-.164-1.386-.51-2.64-1.628-.976-.871-1.635-1.947-1.826-2.275-.19-.328-.02-.505.144-.668.148-.147.328-.383.492-.574.164-.192.219-.328.328-.547.109-.219.055-.41-.027-.574-.082-.164-.737-1.775-1.01-2.43-.266-.64-.536-.554-.737-.564-.19-.008-.41-.01-.628-.01-.219 0-.574.082-.874.41-.3.328-1.146 1.12-1.146 2.73 0 1.61 1.173 3.165 1.337 3.383.164.219 2.31 3.527 5.598 4.945.782.338 1.393.54 1.869.69.785.25 1.5.215 2.065.13.63-.094 1.937-.792 2.21-1.557.273-.766.273-1.42.191-1.557-.082-.137-.3-.219-.628-.383Z"/></svg>`;

const iconoMas = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const iconoCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

/* ================= CARRITO DE SELECCIÓN ================= */

const CARRITO_KEY = "rfragancias_carrito";
const TAMANOS_DISPONIBLES = [50, 100];

function cargarCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
  } catch {
    return [];
  }
}

let carrito = cargarCarrito();

function guardarCarrito() {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const contador = document.getElementById("contador-carrito");
  const total = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  contador.textContent = total;
  contador.hidden = total === 0;
}

function agregarAlCarrito(perfume, tamano) {
  const existente = carrito.find((i) => i.id === perfume.id && i.tamano === tamano);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      id: perfume.id,
      nombre: perfume.nombre,
      disenador: perfume.disenador || "",
      tamano,
      cantidad: 1,
    });
  }
  guardarCarrito();
}

function fusionarDuplicados() {
  // Por si al cambiar el tamaño de un ítem queda igual a otro ya existente
  const combinados = [];
  carrito.forEach((item) => {
    const igual = combinados.find((i) => i.id === item.id && i.tamano === item.tamano);
    if (igual) igual.cantidad += item.cantidad;
    else combinados.push({ ...item });
  });
  carrito = combinados;
}

function cambiarTamano(id, tamanoActual, nuevoTamano) {
  const item = carrito.find((i) => i.id === id && i.tamano === tamanoActual);
  if (!item) return;
  item.tamano = nuevoTamano;
  fusionarDuplicados();
  guardarCarrito();
  renderPanelCarrito();
}

function cambiarCantidad(id, tamano, delta) {
  const item = carrito.find((i) => i.id === id && i.tamano === tamano);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter((i) => !(i.id === id && i.tamano === tamano));
  }
  guardarCarrito();
  renderPanelCarrito();
}

function quitarDeCarrito(id, tamano) {
  carrito = carrito.filter((i) => !(i.id === id && i.tamano === tamano));
  guardarCarrito();
  renderPanelCarrito();
}

function renderPanelCarrito() {
  const lista = document.getElementById("lista-carrito");
  const pie = document.getElementById("panel-carrito-footer");

  if (carrito.length === 0) {
    lista.innerHTML = `
      <div class="carrito-vacio">
        ${iconoCarritoGrande()}
        <p>Todavía no has agregado ningún perfume.<br />Explora el catálogo y dale al botón "+" en los que te interesen.</p>
      </div>`;
    pie.classList.add("vacio");
    return;
  }

  pie.classList.remove("vacio");
  lista.innerHTML = carrito.map((item) => `
    <div class="item-carrito">
      <div class="item-carrito-info">
        <p class="nombre">${escaparHtml(item.nombre)}</p>
        ${item.disenador ? `<p class="disenador">${escaparHtml(item.disenador)}</p>` : ""}
        <div class="selector-tamano-carrito">
          ${TAMANOS_DISPONIBLES.map((t) => `
            <button type="button" class="${item.tamano === t ? "activo" : ""}"
              data-accion="tamano" data-id="${item.id}" data-tamano-actual="${item.tamano}" data-tamano-nuevo="${t}">
              ${t} ml
            </button>
          `).join("")}
        </div>
      </div>
      <div class="item-carrito-cantidad">
        <button type="button" data-accion="menos" data-id="${item.id}" data-tamano="${item.tamano}" aria-label="Quitar una unidad">−</button>
        <span>${item.cantidad}</span>
        <button type="button" data-accion="mas" data-id="${item.id}" data-tamano="${item.tamano}" aria-label="Agregar una unidad">+</button>
      </div>
      <button type="button" class="quitar-item-carrito" data-accion="quitar" data-id="${item.id}" data-tamano="${item.tamano}" aria-label="Quitar del todo">&times;</button>
    </div>
  `).join("");

  const link = document.getElementById("btn-compartir-carrito");
  const lineas = carrito.map((item, i) =>
    `${i + 1}. ${item.nombre}${item.disenador ? ` — ${item.disenador}` : ""} · ${item.tamano} ml (x${item.cantidad})`
  );
  const mensaje = encodeURIComponent(
    `Hola! Vi estos perfumes en el catálogo y quiero consultar por ellos:\n\n${lineas.join("\n")}\n\n¿Me confirman disponibilidad y precio? Gracias!`
  );
  link.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`;
}

function iconoCarritoGrande() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 4h-2l-.4 2m2.4-2 1.6 8.4a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 2-1.6L21 8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>`;
}

document.getElementById("lista-carrito").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-accion]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const accion = btn.dataset.accion;

  if (accion === "mas") cambiarCantidad(id, Number(btn.dataset.tamano), 1);
  if (accion === "menos") cambiarCantidad(id, Number(btn.dataset.tamano), -1);
  if (accion === "quitar") quitarDeCarrito(id, Number(btn.dataset.tamano));
  if (accion === "tamano") {
    cambiarTamano(id, Number(btn.dataset.tamanoActual), Number(btn.dataset.tamanoNuevo));
  }
});

document.getElementById("btn-vaciar-carrito").addEventListener("click", () => {
  if (carrito.length === 0) return;
  if (!confirm("¿Vaciar toda tu selección?")) return;
  carrito = [];
  guardarCarrito();
  renderPanelCarrito();
});

function abrirCarrito() {
  renderPanelCarrito();
  document.getElementById("overlay-carrito").classList.add("activo");
}
function cerrarCarrito() {
  document.getElementById("overlay-carrito").classList.remove("activo");
}

document.getElementById("btn-carrito").addEventListener("click", abrirCarrito);
document.getElementById("cerrar-carrito").addEventListener("click", cerrarCarrito);
document.getElementById("overlay-carrito").addEventListener("click", (e) => {
  if (e.target.id === "overlay-carrito") cerrarCarrito();
});

/* ---- Selector de tamaño (50/100 ml) al agregar desde una tarjeta ---- */

let perfumePendiente = null;
const overlayTamano = document.getElementById("overlay-tamano");

function pedirTamanoYAgregar(perfume) {
  perfumePendiente = perfume;
  document.getElementById("tamano-nombre-perfume").textContent = perfume.nombre;
  overlayTamano.classList.add("activo");
}

function cerrarSelectorTamano() {
  overlayTamano.classList.remove("activo");
  perfumePendiente = null;
}

overlayTamano.addEventListener("click", (e) => {
  if (e.target.id === "overlay-tamano") cerrarSelectorTamano();
});
document.getElementById("cerrar-tamano").addEventListener("click", cerrarSelectorTamano);

document.querySelectorAll("#overlay-tamano .opciones-tamano button").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!perfumePendiente) return;
    agregarAlCarrito(perfumePendiente, Number(btn.dataset.tamano));
    destellarBotonTarjeta(perfumePendiente.id);
    cerrarSelectorTamano();
  });
});

function destellarBotonTarjeta(id) {
  const btn = grid.querySelector(`.accion-carrito[data-id="${id}"]`);
  if (!btn) return;
  btn.classList.add("activo");
  btn.innerHTML = iconoCheck;
  setTimeout(() => {
    btn.classList.remove("activo");
    btn.innerHTML = iconoMas;
  }, 900);
}

/* ================= TARJETAS DEL CATÁLOGO ================= */

function tarjetaPerfume(p) {
  // imagenUrl viene como ruta relativa (ej: "/api/perfumes/4/imagen"); como
  // el catálogo y el backend ahora son dos sitios distintos, le anteponemos
  // la dirección completa del backend.
  const imagen = p.imagenUrl
    ? `<img src="${API_BASE_URL}${p.imagenUrl}" alt="${escaparHtml(p.nombre)}" loading="lazy" />`
    : iconoFrasco;

  const mensaje = encodeURIComponent(`Hola, estoy interesado en un perfume: "${p.nombre}" que vi en el catálogo.`);
  const linkConsulta = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`;

  return `
    <article class="tarjeta-perfume">
      <div class="imagen">${imagen}</div>
      <span class="etiqueta-genero ${escaparHtml(p.genero)}">${escaparHtml(p.genero)}</span>
      <div class="acciones-tarjeta">
        <button type="button" class="boton-circular accion-carrito" data-id="${p.id}"
          aria-label="Agregar a mi selección" title="Agregar a mi selección">${iconoMas}</button>
        <a class="boton-circular consultar-perfume" href="${linkConsulta}" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp sobre ${escaparHtml(p.nombre)}">${iconoWhatsapp}</a>
      </div>
      <div class="info">
        <p class="disenador">${escaparHtml(p.disenador || "Diseñador no especificado")}</p>
        <h3>${escaparHtml(p.nombre)}</h3>
        <p class="notas-perfume"><span>Notas:</span> ${escaparHtml(p.notas || "Sin descripción disponible")}</p>
      </div>
    </article>
  `;
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".accion-carrito");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const perfume = ultimosPerfumes.find((p) => p.id === id);
  if (!perfume) return;
  pedirTamanoYAgregar(perfume);
});

/* ================= CARGA POR TANDAS (scroll infinito) ================= */

async function cargarTanda({ reiniciar }) {
  if (cargandoTanda) return;
  if (!reiniciar && !hayMasPorCargar) return;

  cargandoTanda = true;

  if (reiniciar) {
    desdeActual = 0;
    hayMasPorCargar = true;
    ultimosPerfumes = [];
    grid.innerHTML = `<p class="estado-vacio">Cargando catálogo…</p>`;
  } else {
    centinela.textContent = "Cargando más fragancias…";
  }

  const params = new URLSearchParams();
  if (generoActivo !== "Todos") params.set("genero", generoActivo);
  if (terminoBusqueda) params.set("buscar", terminoBusqueda);
  params.set("desde", desdeActual);
  params.set("limite", LIMITE_POR_TANDA);

  try {
    const resp = await fetch(`${API_BASE_URL}/api/perfumes?${params.toString()}`);
    if (!resp.ok) throw new Error("Error al cargar el catálogo");
    const { items, total, hayMas } = await resp.json();

    totalResultados = total;
    hayMasPorCargar = hayMas;
    desdeActual += items.length;
    ultimosPerfumes = ultimosPerfumes.concat(items);

    if (reiniciar && items.length === 0) {
      grid.innerHTML = `
        <div class="estado-vacio" style="grid-column: 1 / -1;">
          <h3>No encontramos fragancias con esos filtros</h3>
          <p>Intenta con otra búsqueda o quita los filtros.</p>
        </div>`;
      contadorResultados.textContent = "";
      centinela.textContent = "";
      return;
    }

    const html = items.map(tarjetaPerfume).join("");
    if (reiniciar) grid.innerHTML = html;
    else grid.insertAdjacentHTML("beforeend", html);

    contadorResultados.textContent = `Mostrando ${ultimosPerfumes.length} de ${total} fragancias`;
    centinela.textContent = hayMasPorCargar ? "" : "Ya viste todo el catálogo ✨";
  } catch (err) {
    console.error(err);
    if (reiniciar) {
      grid.innerHTML = `
        <div class="estado-vacio" style="grid-column: 1 / -1;">
          <h3>No pudimos cargar el catálogo</h3>
          <p>Verifica tu conexión e intenta de nuevo.</p>
        </div>`;
    } else {
      centinela.textContent = "No se pudo cargar más. Baja de nuevo para reintentar.";
    }
  } finally {
    cargandoTanda = false;
  }
}

// Cuando el centinela (al final de la grilla) entra en pantalla, se pide la siguiente tanda.
const observador = new IntersectionObserver(
  (entradas) => {
    if (entradas[0].isIntersecting) cargarTanda({ reiniciar: false });
  },
  { rootMargin: "600px" }
);
observador.observe(centinela);

botonesGenero.forEach((btn) => {
  btn.addEventListener("click", () => {
    botonesGenero.forEach((b) => b.classList.remove("activa"));
    btn.classList.add("activa");
    generoActivo = btn.dataset.genero;
    cargarTanda({ reiniciar: true });
  });
});

buscador.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => {
    terminoBusqueda = buscador.value.trim();
    cargarTanda({ reiniciar: true });
  }, 350);
});

actualizarContadorCarrito();
cargarTanda({ reiniciar: true });

/* ================= ANIMACIÓN DE BIENVENIDA ================= */

(function ocultarSplash() {
  const splash = document.getElementById("intro-splash");
  if (!splash) return;

  const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const espera = prefiereMenosMovimiento ? 150 : 1300;

  setTimeout(() => {
    splash.classList.add("oculto");
    setTimeout(() => splash.remove(), 650);
  }, espera);
})();
