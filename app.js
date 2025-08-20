document.addEventListener("DOMContentLoaded", () => {
  try { bootstrap(); } catch (e) {
    const doc = document.getElementById("doc");
    if (doc) doc.innerHTML = `<div class="text-red-600 p-4">Error inicializando: ${e.message}</div>`;
    console.error(e);
  }
});

function bootstrap() {
  // ===== Utilidades =====
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const formatDateLong = (iso) =>
    new Date(iso || Date.now()).toLocaleDateString("es-AR", {
      year: "numeric", month: "long", day: "numeric",
    });
  const formatCurrency = (num, currency = "ARS") =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 })
      .format(isNaN(+num) ? 0 : +num);
  // Normaliza URL de logo: si es ruta local, la convierte a file:///
  function normalizeLogoUrl(raw) {
  if (!raw) return "";
  // quita comillas y espacios
  let s = String(raw).trim().replace(/"/g, "");
  // si es ruta Windows tipo D:\carpeta\logo.jpg -> file:///D:/carpeta/logo.jpg
  if (/^[A-Za-z]:\\/.test(s)) {
    s = "file:///" + s.replace(/\\/g, "/");
  }
  return s;
}

  // filename: limpia caracteres inválidos de Windows
  const safeFilename = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, "").trim();
  // quita acentos de forma compatible
  const removeDiacritics = (str) => String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const upperNoDiacritics = (s) => removeDiacritics(s).toUpperCase();

  // ===== Plantillas =====
  const TEMPLATES = {
    mensuraPosesion: {
      name: "Mensura de Posesión",
      description:
        "La Mensura de Posesión permite identificar de forma fehaciente qué derechos de propiedad o parte de derechos se ven afectados por la posesión. " +
        "En el plano de mensura de posesión constan la ubicación, las medidas lineales, angulares y de superficie del polígono sobre el cual se ejerce el derecho de posesión en {{lugar}}.",
      alcance: [
        "Investigación completa de títulos, antecedentes registrales y catastrales",
        "Planificación de la campaña, medición, determinación de ocupación actual y materialización en el lote.",
        "Cálculo y confección del plano de mensura de posesión."
      ],
    },
    amojonamiento: {
      name: "Amojonamiento",
      description:
        "El amojonamiento es el acto de materializar los límites de una parcela con mojones. El procedimiento consiste en la compilación de todos los antecedentes cartográficos, catastrales y de títulos para contrastarlos con los hechos existentes a fin de determinar la correcta ubicación de la parcela en {{lugar}}. " +
        "Se entrega plano de amojonamiento con medidas dentro de la manzana.",
      alcance: [
        "Investigación y análisis de antecedentes dominiales y cartográficos",
        "Planificación de la campaña y medición completa.",
        "Colocación de mojones en vértices.",
        "Confección del plano."
      ],
    },
    relevamientoTopo: {
      name: "Relevamiento Topográfico",
      description:
        "Relevamiento planialtimétrico con estación total/GNSS, curvas de nivel y entrega de archivo CAD/DWG en {{lugar}}.",
      alcance: [
        "Medición precisa de cotas y desniveles del terreno y calle.",
        "Curvas de nivel y archivo CAD/DWG.",
        "Informe con referencias y tolerancias."
      ],
    },
    mensuraSubdiv: {
      name: "Mensura y Subdivisión",
      description:
        "División del inmueble en {{lugar}} conforme normativa. Tareas de relevamiento de campo, cálculo, materialización de mojones y confección del plano de mensura y subdivisión.",
      alcance: [
        "Relevamiento de campo.",
        "Materialización de mojones según normativa.",
        "Plano de mensura y subdivisión.",
        "Gestiones ante Catastro/Municipalidad (tasas no incluidas).",
      ],
    },
    bep: {
      name: "BEP – Verificación de Estado Parcelario",
      description:
        "Verificación del estado parcelario del inmueble en {{lugar}}: investigación de títulos, relevamiento y análisis comparativo con planos vigentes. Emisión de informe/constancia correspondiente.",
      alcance: [
        "Análisis de antecedentes y normativa.",
        "Relevamiento y verificación de medidas.",
        "Informe/constancia de BEP (tasas no incluidas).",
      ],
    },
    usucapion: {
      name: "Usucapión",
      description:
        "Mensura y documentación técnica de apoyo a la acción judicial de prescripción adquisitiva (usucapión) en {{lugar}}. " +
        "Incluye la mensura de posesión para identificar con precisión los derechos de propiedad afectados (ubicación y medidas lineales, angulares y de superficie del polígono sobre el cual se ejerce el derecho de posesión), " +
        "la confección del plano de mensura correspondiente y gestiones técnicas ante los organismos que correspondan.",
      alcance: [
        "Mensura de posesión: investigación de antecedentes dominiales/catastrales; planificación de campaña y medición en campo; cálculo y confección del plano de mensura.",
      ],
      // Etapas (informativas)
      etapas: [
        {
          titulo: "1) Mensura de Posesión",
          items: [
            "Investigación y análisis de antecedentes dominiales y cartográficos.",
            "Planificación de la campaña y medición completa.",
            "Confección de plano de mensura de posesión."
          ],
          subtotal: 450000
        },
        {
          titulo: "2) Visado en Colegio Profesional",
          items: [
            "Visado del plano ante el Colegio de Ingenieros."
          ],
          subtotal: 400000
        },
        {
          titulo: "3) Presentación Municipal",
          items: [
            "Presentación del plano en el Municipio y visado.",
            "Tasas municipales y presentación: a cargo del comitente."
          ]
          // sin subtotal
        },
        {
          titulo: "4) Con intervención letrada",
          items: [
            "Presentación del plano en Catastro (al inicio del trámite).",
            "Nota de rogación a cargo del cliente/escribano."
          ],
          subtotal: 400000
        }
      ]
    },
  };

  // ===== Estado y refs =====
  const state = {
    // empresa
    empresa: {
      razon: document.getElementById("empRazon"),
      profesional: document.getElementById("empProfesional"),
      cuit: document.getElementById("empCuit"),
      dom: document.getElementById("empDom"),
      email: document.getElementById("empEmail"),
      tel: document.getElementById("empTel"),
      logo: document.getElementById("empLogo"),
      logoFile: document.getElementById("empLogoFile"),
      leyenda: document.getElementById("empLeyenda"),
    },
    // presupuesto
    fecha: document.getElementById("fecha"),
    modelo: document.getElementById("modelo"),
    comitente: document.getElementById("comitente"),
    telefono: document.getElementById("telefono"),
    email: document.getElementById("email"),
    ubicacion: document.getElementById("ubicacion"),
    moneda: document.getElementById("moneda"),
    monto: document.getElementById("monto"),
    montoHint: document.getElementById("montoHint"),
    plazo: document.getElementById("plazo"),
    validez: document.getElementById("validez"),
    observaciones: document.getElementById("observaciones"),
    textoModelo: document.getElementById("textoModelo"),
    // pago/hitos/cuotas (UI nueva)
    pago: {
      modoAvance: document.getElementById("pagoModoAvance"),
      modoCuotas: document.getElementById("pagoModoCuotas"),
      pagoAvance: document.getElementById("pagoAvance"),
      pagoCuotas: document.getElementById("pagoCuotas"),
      hitosContainer: document.getElementById("hitosContainer"),
      btnAddHito: document.getElementById("btnAddHito"),
      sumaHitos: document.getElementById("sumaHitos"),
      cuotasCant: document.getElementById("cuotasCant"),
      cuotasInfo: document.getElementById("cuotasInfo"),
    },
    // visado
    visado: {
      chk: document.getElementById("chkVisado"),
      monto: document.getElementById("montoVisado"),
    },
    // doc
    doc: document.getElementById("doc"),
    btnDescargar: document.getElementById("btnDescargar"),
  };

  let logoDataURL = ""; // si se sube archivo

  // ===== Init =====
  function initDefaults() {
    state.fecha.value = todayISO();
    state.textoModelo.value = ""; // vacío = usa el texto del modelo
    setupPago(); // crea hitos por defecto y listeners
    updateAll();
  }
  initDefaults();

  // Cargar logo desde archivo -> dataURL
  if (state.empresa.logoFile) {
  state.empresa.logoFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      logoDataURL = String(fr.result);
      state.empresa.logo.value = "";   // <- importante
      updatePreview();
    };
    fr.readAsDataURL(file);
  });
}


  // === Pago (hitos/cuotas) ===================================
  function addHito(desc = "", monto = "") {
    const row = document.createElement("div");
    row.className = "hito-row grid grid-cols-12 gap-2";
    row.innerHTML = `
      <input class="col-span-7 rounded-xl border p-2" placeholder="Descripción del hito" value="${desc}">
      <input class="col-span-4 rounded-xl border p-2" placeholder="Ej: 250000" type="number" step="0.01" value="${monto}">
      <button type="button" class="col-span-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700">✕</button>
    `;
    state.pago.hitosContainer.appendChild(row);

    const [descInput, montoInput, btn] = row.children;
    const onChange = () => updatePagoUI();
    descInput.addEventListener("input", onChange);
    montoInput.addEventListener("input", onChange);
    btn.addEventListener("click", () => { row.remove(); updatePagoUI(); });
  }

  function getHitos() {
    const rows = state.pago.hitosContainer.querySelectorAll(".hito-row");
    const arr = [];
    rows.forEach(r => {
      const d = r.children[0].value.trim();
      const m = parseFloat(String(r.children[1].value).replace(/,/g, ".")) || 0;
      if (d || m) arr.push({ d, m });
    });
    return arr;
  }

  function sumHitos() {
    return getHitos().reduce((acc, h) => acc + (h.m || 0), 0);
  }

  function setupPago() {
    // dos hitos iniciales
    addHito("Día de medición", "");
    addHito("Contra entrega de plano", "");
    // listeners UI
    state.pago.btnAddHito.addEventListener("click", () => addHito());
    state.pago.modoAvance.addEventListener("change", togglePagoModo);
    state.pago.modoCuotas.addEventListener("change", togglePagoModo);
    state.pago.cuotasCant.addEventListener("input", updatePagoUI);
    // visado
    state.visado.chk.addEventListener("change", () => {
      state.visado.monto.disabled = !state.visado.chk.checked;
      updateAll();
    });
    state.visado.monto.addEventListener("input", updateAll);
  }

  function togglePagoModo() {
    const avance = state.pago.modoAvance.checked;
    state.pago.pagoAvance.classList.toggle("hidden", !avance);
    state.pago.pagoCuotas.classList.toggle("hidden", avance);
    updatePagoUI();
  }

  function visadoSeleccionado() { return !!state.visado.chk.checked; }
  function visadoMonto() {
    return visadoSeleccionado()
      ? (parseFloat(String(state.visado.monto.value).replace(/,/g, ".")) || 0)
      : 0;
  }
  function totalHonorarios() {
    const base = parseFloat(String(state.monto.value).replace(/,/g, ".")) || 0;
    return base + visadoMonto();
  }

  function updatePagoUI() {
    // suma de hitos
    const suma = sumHitos();
    state.pago.sumaHitos.textContent = `Suma de hitos: ${formatCurrency(suma, state.moneda.value)}`;

    // info cuotas
    const n = Math.max(2, parseInt(state.pago.cuotasCant.value || "0", 10));
    const total = totalHonorarios(); // base + visado
    const porCuota = total / n;
    state.pago.cuotasInfo.textContent = `${n} cuotas de ${formatCurrency(porCuota, state.moneda.value)} (total ${formatCurrency(total, state.moneda.value)})`;

    updatePreview();
  }
  // ===========================================================

  // ===== Render =====
  function updateAll() {
    const monto = parseFloat(String(state.monto.value).replace(/,/g, ".")) || 0;
    state.montoHint.textContent = `Se mostrará como ${formatCurrency(monto, state.moneda.value)}`;
    updatePagoUI();
  }

  function buildHeaderHTML() {
    const logoUrl = logoDataURL || normalizeLogoUrl(state.empresa.logo.value);

    const razon = state.empresa.razon.value || "";
    const profesional = state.empresa.profesional.value || "";

    return `
      <div class="flex items-start justify-between border-b pb-4">
        <div class="flex items-center gap-4">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="Logo" crossorigin="anonymous" class="h-16 w-16 object-cover rounded-full ring-2 ring-amber-300">`
            : `<div class="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-300">LOGO</div>`
          }
        </div>
        <div class="flex-1 text-center">
          <div class="text-3xl md:text-4xl font-extrabold tracking-wide" style="color:#F2C94C">${razon.toUpperCase()}</div>
        </div>
        <div class="text-right text-sm">
          ${profesional ? `<div class="italic text-gray-700">${profesional}</div>` : ""}
          <div class="text-gray-600">${formatDateLong(state.fecha.value)}</div>
        </div>
      </div>`;
  }

  function updatePreview() {
    try {
      const tpl = TEMPLATES[state.modelo.value];                 // <-- Faltaba
      const baseMonto = parseFloat(String(state.monto.value).replace(/,/g, ".")) || 0;
      const total = totalHonorarios(); // base + visado (si está tildado)

      // Cuerpo (permite override desde textarea)
      const view = {
        nombre: state.comitente.value,
        lugar: state.ubicacion.value,
        fechaLarga: formatDateLong(state.fecha.value),
        montoFormateado: formatCurrency(baseMonto, state.moneda.value),
        validez: state.validez.value,
      };
      const descripcionBase = state.textoModelo.value.trim()
        ? state.textoModelo.value
        : tpl.description;
      const descripcion = Mustache.render(descripcionBase, view);

      // Leyenda
      const leyendaLegal = Mustache.render(state.empresa.leyenda.value || "", { validez: state.validez.value });

      // construir HTML del documento
      state.doc.classList.remove("flex","items-center","justify-center"); // por si quedó de una versión anterior
      state.doc.innerHTML = `
        ${buildHeaderHTML()}

        <!-- Datos del presupuesto -->
        <div class="grid grid-cols-2 gap-2 text-sm mb-4 mt-4">
          <div><span class="font-medium">Comitente:</span> ${state.comitente.value || "—"}</div>
          <div><span class="font-medium">Teléfono:</span> ${state.telefono.value || "—"}</div>
          <div><span class="font-medium">Email:</span> ${state.email.value || "—"}</div>
          <div><span class="font-medium">Ubicación:</span> ${state.ubicacion.value || "—"}</div>
        </div>

        <!-- Único título del trabajo (centrado) -->
        <div class="my-4 py-2 border-y border-gray-200 text-center">
          <span class="text-xl md:text-2xl font-bold">Presupuesto:</span>
          <span class="text-xl md:text-2xl text-blue-700 underline underline-offset-4">${tpl.name}</span>
        </div>

        <!-- Cuerpo -->
        <div class="leading-relaxed text-[15px] text-justify">
          <p class="whitespace-pre-wrap">${descripcion}</p>
          ${(tpl.alcance && tpl.alcance.length) ? `
            <div class="mt-3">
              <div class="font-semibold">Alcance</div>
              <ul class="list-disc ml-5 mt-1">
                ${tpl.alcance.map(item => `<li>${item}</li>`).join("")}
              </ul>
            </div>` : ""}
          ${(tpl.etapas && tpl.etapas.length) ? `
            <div class="mt-4">
              <div class="font-semibold">Etapas</div>
              ${tpl.etapas.map(et => `
                <div class="mt-2">
                  <div class="font-medium">${et.titulo}</div>
                  ${(et.items && et.items.length) ? `
                    <ul class="list-disc ml-5 mt-1">
                      ${et.items.map(i => `<li>${i}</li>`).join("")}
                    </ul>
                  ` : ""}
                  ${typeof et.subtotal === "number" ? `
                    <div class="text-right text-sm mt-1">
                      <span class="text-gray-600 mr-2">Subtotal etapa:</span>
                      <b>${formatCurrency(et.subtotal, state.moneda.value)}</b>
                    </div>
                  ` : ""}
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <!-- Honorarios -->
        <div class="mt-6">
          <div class="rounded-xl border border-amber-200">
            <div class="px-4 py-2 bg-amber-50 border-b border-amber-200 font-semibold text-blue-900">
              Honorarios Profesionales
            </div>
            <div class="p-4 text-sm space-y-1">
              <div class="flex justify-between py-1">
                <span>Subtotal (honorarios)</span>
                <span>${formatCurrency(baseMonto, state.moneda.value)}</span>
              </div>
              ${visadoSeleccionado() ? `
              <div class="flex justify-between py-1">
                <span>Visado colegio de ingenieros</span>
                <span>${formatCurrency(visadoMonto(), state.moneda.value)}</span>
              </div>` : ""}
              <div class="flex justify-between border-t mt-2 pt-2 font-semibold">
                <span>TOTAL</span>
                <span>${formatCurrency(total, state.moneda.value)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Forma de pago -->
        <div class="mt-4">
          <div class="rounded-xl border">
            <div class="px-4 py-2 bg-amber-50 border-b border-amber-200 font-semibold text-blue-900">Forma de pago</div>
            <div class="p-4 text-sm">
              ${state.pago.modoAvance.checked ? `
                <ul class="list-disc ml-5 space-y-1">
                  ${getHitos().map(h => `<li>${h.d || "(sin descripción)"} – <b>${formatCurrency(h.m || 0, state.moneda.value)}</b></li>`).join("") || "<li>(Agregar hitos)</li>"}
                </ul>
                <div class="text-right mt-2 text-xs text-gray-600">
                  Suma de hitos: ${formatCurrency(sumHitos(), state.moneda.value)}
                </div>
              ` : `
                <div>
                  ${Math.max(2, parseInt(state.pago.cuotasCant.value || "0", 10))} cuotas de
                  <b>${formatCurrency(total / Math.max(2, parseInt(state.pago.cuotasCant.value || "0", 10)), state.moneda.value)}</b>
                  (total ${formatCurrency(total, state.moneda.value)})
                </div>
              `}
            </div>
          </div>
        </div>

        ${state.observaciones.value.trim() ? `
          <div class="mt-4 text-sm"><span class="font-medium">Observaciones:</span> ${state.observaciones.value.trim()}</div>
        ` : ""}

        <div class="mt-6 text-xs text-gray-600 border-t pt-3">${leyendaLegal}</div>
        <!-- Sin bloque de firma -->
      `;
    } catch (e) {
  console.error("PDF error:", e);
  alert("No se pudo generar el PDF: " + (e?.message || "revisá la consola"));
}
  }

  // ===== Eventos =====
  [
    state.fecha, state.modelo, state.comitente, state.telefono, state.email,
    state.ubicacion, state.moneda, state.monto, state.plazo, state.validez,
    state.observaciones,
    state.empresa.razon, state.empresa.profesional, state.empresa.cuit,
    state.empresa.dom, state.empresa.email, state.empresa.tel,
    state.empresa.logo, state.empresa.leyenda, state.textoModelo
  ].forEach(el => el && el.addEventListener("input", updateAll));

  // Nota: radios, botón "Agregar hito", inputs de hitos y visado se enganchan en setupPago().

  state.btnDescargar.addEventListener("click", async () => {
    try {
      const canvas = await html2canvas(state.doc, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794 });
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const ratio = canvas.height / canvas.width;
      const renderW = pdfW;
      const renderH = renderW * ratio;
      pdf.addImage(imgData, "PNG", 0, 0, renderW, renderH, undefined, "FAST");

      // Nombre de archivo: Nombre, Ubicación, TIPO.pdf
      const nombre = safeFilename(state.comitente.value || "Cliente");
      const lugar = safeFilename(state.ubicacion.value || "Lugar");
      const tipo = upperNoDiacritics(TEMPLATES[state.modelo.value].name);
      const filename = `${nombre},${tipo}.pdf`;

      pdf.save(filename);
    } catch (e) {
      alert("No se pudo generar el PDF. Revisá la consola.");
      console.error(e);
    }
  });

  // primer render
  updatePreview();

} // end bootstrap
