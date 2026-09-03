// --- CONFIGURACIÓN DE CREDENCIALES DE SUPABASE ---
const SUPABASE_URL = "https://rhgskluslkthtvjhfrxy.supabase.co";
const SUPABASE_KEY = "sb_publishable_W2ZrcHc2HCWbO0vAWZ3AeQ_gfstDZGB"; // Tu clave pública

let supabaseClient = null;
let ventas = [];
let usuarioRol = "invitado"; // Rol inicial de seguridad por defecto

// --- SISTEMA DE LOGIN UI/UX ---
function procesarLogin() {
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const errorLbl = document.getElementById('loginError');

    // Validación local de seguridad sin llamadas CORS extras
    if (user === "administrador" && pass === "ka2026") {
        usuarioRol = "admin";
        configurarInterfazPorRol();
    } else if (user === "invitado" && pass === "ka123") {
        usuarioRol = "invitado";
        configurarInterfazPorRol();
    } else {
        errorLbl.textContent = "Credenciales incorrectas. Intenta de nuevo.";
    }
}

function configurarInterfazPorRol() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('lblRol').textContent = usuarioRol === "admin" ? "Administrador" : "Invitado";

    // Ocultar paneles administrativos si es invitado
    if (usuarioRol === "invitado") {
        document.getElementById('panelFormularios').classList.add('invitado-view');
        // Ocultar sección de registro visualmente
        const adminCard = document.querySelector('.panel-admin-only');
        if (adminCard) adminCard.style.display = 'none';
        document.getElementById('txtAyudaEdicion').textContent = "📋 Modo lectura: No tienes permisos para modificar datos.";
    } else {
        document.getElementById('txtAyudaEdicion').textContent = "💡 Modifica los abonos directamente en las celdas de la tabla.";
    }
    
    // Inicializar cliente y descargar base cloud
    iniciarApp();
}

function cerrarSesion() {
    location.reload(); // Resetea el estado de memoria del navegador de forma segura
}

// --- ARRANQUE SEGURO ---
function iniciarApp() {
    if (typeof supabase === 'undefined') {
        setTimeout(iniciarApp, 1000);
        return;
    }
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        obtenerVentasIniciales(true);
        // Sincronización automática cloud cada 3 segundos
        setInterval(() => obtenerVentasIniciales(false), 3000);
    } catch (error) {
        console.error("Error estructural en cliente:", error);
    }
}

// --- LEER DATOS Y ACTUALIZAR CONTADORES SUPERIORES ---
async function obtenerVentasIniciales(forzarRender = false) {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('ventas')
        .select('*')
        .order('id', { ascending: true });

    if (!error) {
        if (forzarRender || JSON.stringify(ventas) !== JSON.stringify(data)) {
            ventas = data;
            calcularMetricasCaja(); // Procesar contadores superiores
            renderVentas();
        }
    }
}

function calcularMetricasCaja() {
    let cajaEfectivo = 0;
    let dineroFlujo = 0;
    let gananciaReal = 0;

    ventas.forEach(v => {
        cajaEfectivo += parseFloat(v.total_recibido) || 0;
        dineroFlujo += parseFloat(v.saldo) || 0;
        
        // La ganancia real acumulada es lo recibido menos el costo proporcional invertido
        // Si el precio de venta es cero evitamos división entre cero
        if (v.price > 0) {
            const factorRetorno = v.total_recibido / v.price;
            const costoProporcionalCobrado = v.cost * factorRetorno;
            gananciaReal += (v.total_recibido - costoProporcionalCobrado);
        }
    });

    // Inyectar en las tarjetas superiores de la pantalla
    document.getElementById('txtCajaEfectivo').textContent = `$${cajaEfectivo.toFixed(2)}`;
    document.getElementById('txtDineroFlujo').textContent = `$${dineroFlujo.toFixed(2)}`;
    document.getElementById('txtGananciaReal').textContent = `$${gananciaReal.toFixed(2)}`;
}
// --- GUARDAR NUEVA VENTA EN LA NUBE ---
async function agregarVenta() {
    if (usuarioRol !== "admin") {
        alert("Acción no permitida para tu nivel de acceso.");
        return;
    }

    const name = document.getElementById('prodName').value;
    const cost = parseFloat(document.getElementById('prodCost').value);
    const price = parseFloat(document.getElementById('prodPrice').value);
    const pago1 = parseFloat(document.getElementById('prodPago1').value);

    if (!name || isNaN(cost) || isNaN(price) || isNaN(pago1)) {
        alert("Por favor rellena todos los campos correctamente.");
        return;
    }

    const saldo = price - pago1;
    const nuevaVenta = {
        name: name,
        cost: cost,
        price: price,
        pago1: pago1,
        pago2: 0,
        total_recibido: pago1,
        saldo: saldo,
        status: saldo <= 0 ? 'Pagado' : 'Pendiente'
    };

    const { error } = await supabaseClient.from('ventas').insert([nuevaVenta]);
    if (!error) {
        document.getElementById('prodName').value = '';
        obtenerVentasIniciales(true);
    }
}

// --- MODIFICAR ABONOS CON MENSAJE DE CONFIRMACIÓN ---
async function modificarPago(id, campo, nuevoValor) {
    if (usuarioRol !== "admin") {
        alert("Acceso Denegado. Solo un administrador puede modificar montos.");
        obtenerVentasIniciales(true); // Forzar re-render para revertir el input escrito
        return;
    }

    // Mensaje de confirmación solicitado para evitar errores humanos
    if (!confirm(`⚠️ MENSAJE DE CONTROL:\n¿Estás seguro de que deseas actualizar el valor del Pago ${campo} a $${nuevoValor}?`)) {
        obtenerVentasIniciales(true); // Revertir input visual si cancela
        return;
    }

    const venta = ventas.find(v => v.id === id);
    if (!venta) return;

    const valorNumerico = parseFloat(nuevoValor) || 0;
    let pago1Actualizado = venta.pago1;
    let pago2Actualizado = venta.pago2;

    if (campo === 1) pago1Actualizado = valorNumerico;
    if (campo === 2) pago2Actualizado = valorNumerico;

    const totalRecibido = pago1Actualizado + pago2Actualizado;
    const saldo = venta.price - totalRecibido;
    const status = saldo <= 0 ? 'Pagado' : 'Pendiente';

    const datosActualizados = { 
        pago1: pago1Actualizado, 
        pago2: pago2Actualizado,
        total_recibido: totalRecibido,
        saldo: saldo,
        status: status
    };

    const { error } = await supabaseClient
        .from('ventas')
        .update(datosActualizados)
        .eq('id', id);

    if (!error) obtenerVentasIniciales(true);
}

// --- ELIMINAR CON CONFIRMACIÓN ---
async function eliminarVenta(id) {
    if (usuarioRol !== "admin") {
        alert("Acceso Denegado. No tienes permisos para borrar registros.");
        return;
    }

    if (confirm("⚠️ ADVERTENCIA CRÍTICA:\n¿Estás seguro de que deseas eliminar este registro permanentemente de la nube de K&A Lifestyle?")) {
        const { error } = await supabaseClient.from('ventas').delete().eq('id', id);
        if (!error) obtenerVentasIniciales(true);
    }
}

// --- RENDERIZAR TABLA CON GANANCIA UNITARIA ---
function renderVentas() {
    const tbody = document.querySelector('#ventasTable tbody');
    tbody.innerHTML = '';

    // Ocultar o mostrar columna acciones según rol
    const actionHeader = document.querySelector('.admin-action-header');
    if (actionHeader) actionHeader.style.display = usuarioRol === 'admin' ? '' : 'none';

    if (ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#888;">No hay ventas registradas en la nube.</td></tr>`;
        return;
    }

    ventas.forEach(v => {
        // Calcular la ganancia real del producto basada en lo efectivamente cobrado
        let gananciaProducto = 0;
        if (v.price > 0) {
            const factor = v.total_recibido / v.price;
            gananciaProducto = v.total_recibido - (v.cost * factor);
        }

        // Si es invitado, deshabilitamos las cajas de texto de abonos (disabled)
        const isEditable = usuarioRol === 'admin' ? '' : 'disabled';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${v.id}</td>
            <td><strong>${v.name}</strong></td>
            <td>$${parseFloat(v.cost).toFixed(2)}</td>
            <td>$${parseFloat(v.price).toFixed(2)}</td>
            <td>
                $<input type="number" step="0.01" value="${v.pago1}" ${isEditable}
                style="width:75px; padding:2px; border:1px solid #ccc; border-radius:4px;"
                onchange="modificarPago(${v.id}, 1, this.value)">
            </td>
            <td>
                $<input type="number" step="0.01" value="${v.pago2}" ${isEditable}
                style="width:75px; padding:2px; border:1px solid #ccc; border-radius:4px;"
                onchange="modificarPago(${v.id}, 2, this.value)">
            </td>
            <td>$${parseFloat(v.total_recibido).toFixed(2)}</td>
            <td style="color:${v.saldo > 0 ? 'var(--oro-viejo)' : 'inherit'}">$${parseFloat(v.saldo).toFixed(2)}</td>
            <td style="font-weight:600; color:#27ae60;">$${gananciaProducto.toFixed(2)}</td>
            <td><span class="status ${v.status.toLowerCase()}">${v.status}</span></td>
            ${usuarioRol === 'admin' ? `<td><button class="btn-secondary action-btn" style="background-color:var(--danger); padding:4px 8px;" onclick="eliminarVenta(${v.id})">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

// --- PROYECCIONES A 10 SEMANAS ---
function generarProyeccion() {
    const simCosto = parseFloat(document.getElementById('simCost').value);
    const simPrecio = parseFloat(document.getElementById('simPrice').value);

    if (isNaN(simCosto) || isNaN(simPrecio)) {
        alert("Introduce valores válidos para la simulación.");
        return;
    }

    const tbody = document.querySelector('#proyTable tbody');
    tbody.innerHTML = '';
    document.getElementById('proyeccionesCard').style.display = 'block';

    let cajaFinal = 0;
    let gananciaAcumulada = 0;
    const ahorroSemanal = 1000;
    const inv2Prod = simCosto * 2;
    const abono1 = (simPrecio * 2) / 2;

    let datosGraficoCaja = [];
    let datosGraficoGanancia = [];

    for (let i = 1; i <= 10; i++) {
        let cajaInicial = cajaFinal;
        let abono2 = (i === 1) ? 0 : abono1;
        let cajaDisponible = cajaInicial + ahorroSemanal;

        if (cajaDisponible < inv2Prod) {
            alert(`Falta de liquidez en la semana ${i}. La simulación se pausó.`);
            break;
        }

        cajaFinal = cajaDisponible - inv2Prod + abono1 + abono2;
        if (i > 1) {
            gananciaAcumulada += ((simPrecio * 2) - inv2Prod);
        }

        datosGraficoCaja.push(cajaFinal);
        datosGraficoGanancia.push(gananciaAcumulada);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>Semana ${i}</td>
            <td>$${cajaInicial.toFixed(2)}</td>
            <td style="color:#27ae60">+$${ahorroSemanal.toFixed(2)}</td>
            <td style="color:#c0392b">-$${inv2Prod.toFixed(2)}</td>
            <td>$${abono1.toFixed(2)}</td>
            <td>$${abono2.toFixed(2)}</td>
            <td style="font-weight:bold; color:var(--verde-olivo)">$${gananciaAcumulada.toFixed(2)}</td>
            <td style="font-weight:bold; background-color:var(--primary-light)">$${cajaFinal.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    }
    dibujarGraficoSVG(datosGraficoCaja, datosGraficoGanancia);
}

function dibujarGraficoSVG(cajaData, gananciaData) {
    const svg = document.getElementById('svgChart');
    svg.innerHTML = '';
    const maxVal = Math.max(...cajaData, ...gananciaData, 100);
    const padding = 40; const width = 500; const height = 300;
    const getX = (index) => padding + (index * (width - padding * 2) / 9);
    const getY = (val) => height - padding - (val * (height - padding * 2) / maxVal);

    let pointsCaja = ""; let pointsGanancia = "";
    cajaData.forEach((val, idx) => { pointsCaja += `${getX(idx)},${getY(val)} `; });
    gananciaData.forEach((val, idx) => { pointsGanancia += `${getX(idx)},${getY(val)} `; });

    let lineCaja = `<polyline points="${pointsCaja}" fill="none" stroke="#a38a5d" stroke-width="3" />`;
    let lineGanancia = `<polyline points="${pointsGanancia}" fill="none" stroke="#2f3e32" stroke-width="3" />`;

    let nodos = "";
    cajaData.forEach((val, idx) => {
        nodos += `<circle cx="${getX(idx)}" cy="${getY(val)}" r="4" fill="#a38a5d" />`;
        nodos += `<circle cx="${getX(idx)}" cy="${getY(gananciaData[idx])}" r="4" fill="#2f3e32" />`;
    });

    let ejes = `
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" stroke-width="1" />
    `;
    svg.innerHTML = ejes + lineCaja + lineGanancia + nodos;
}
