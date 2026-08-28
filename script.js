// --- CONFIGURACIÓN DE CREDENCIALES DE SUPABASE ---
const SUPABASE_URL = "https://rhgskluslkthtvjhfrxy.supabase.co";
const SUPABASE_KEY = "sb_publishable_W2ZrcHc2HCWbO0vAWZ3AeQ_gfstDZGB";

let supabaseClient = null;
let ventas = [];

// --- UNICA FUNCIÓN DE ARRANQUE SEGURO ---
function iniciarApp() {
    console.log("🚀 [INICIO] Intentando arrancar aplicación de ventas cloud...");
    
    // Validamos si la librería externa ya existe en el navegador
    if (typeof supabase === 'undefined') {
        console.error("❌ [ERROR] La librería 'supabase' no ha cargado en el HTML. Reintentando en 1 segundo...");
        setTimeout(iniciarApp, 1000);
        return;
    }

    try {
        // CREAMOS EL CLIENTE AQUÍ MISMO
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("🔒 [CONEXIÓN] Cliente de Supabase creado con éxito:", supabaseClient);
        
        // Una vez creado con éxito, mandamos a llamar las ventas
        obtenerVentasIniciales();
        
        console.log("📡 [REALTIME] Conectando canal de escucha en tiempo real...");
        supabaseClient
            .channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, payload => {
                console.log(`⚡ [REALTIME DETECTADO] Cambio en DB (${payload.eventType}).`);
                obtenerVentasIniciales();
            })
            .subscribe((status) => {
                console.log(`🔌 [REALTIME STATUS] Estado del canal: ${status}`);
            });

    } catch (error) {
        console.error("Fallo crítico al inicializar el cliente de Supabase:", error);
    }
}

// --- LEER DATOS DESDE LA NUBE ---
async function obtenerVentasIniciales() {
    if (!supabaseClient) {
        console.error("❌ [DESCARGA ABORTADA] supabaseClient no está inicializado.");
        return;
    }

    console.log("📥 [DESCARGA] Solicitando lista de ventas a Supabase...");
    const { data, error } = await supabaseClient
        .from('ventas')
        .select('*')
        .order('id', { ascending: true });

    if (!error) {
        ventas = data;
        console.log(`✅ [DESCARGA] Éxito. Registros recuperados: ${ventas.length}`, ventas);
        renderVentas();
    } else {
        console.error("❌ [DESCARGA ERROR] Problema al descargar de Supabase:", error);
    }
}

// --- GUARDAR NUEVA VENTA EN LA NUBE ---
async function agregarVenta() {
    const name = document.getElementById('prodName').value;
    const cost = parseFloat(document.getElementById('prodCost').value);
    const price = parseFloat(document.getElementById('prodPrice').value);
    const pago1 = parseFloat(document.getElementById('prodPago1').value);

    console.log(`✍️ [NUEVA VENTA] Capturando: Producto="${name}", Costo=$${cost}, Precio=$${price}, Pago1=$${pago1}`);

    if (!name || isNaN(cost) || isNaN(price) || isNaN(pago1)) {
        console.warn("⚠️ [NUEVA VENTA] Validación fallida. Campos vacíos o incorrectos.");
        alert("Por favor rellena todos los campos correctamente.");
        return;
    }

    if (!supabaseClient) {
        alert("La base de datos aún no está lista. Intenta de nuevo en 2 segundos.");
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

    console.log("📤 [SUBIDA] Enviando nueva venta a Supabase...", nuevaVenta);
    const { error } = await supabaseClient.from('ventas').insert([nuevaVenta]);
    
    if (error) {
        console.error("❌ [SUBIDA ERROR] Supabase rechazó la inserción:", error);
        alert("Error al subir la venta a la nube. Revisa las políticas RLS.");
    } else {
        console.log("🎉 [SUBIDA] Registro creado exitosamente en la nube.");
        document.getElementById('prodName').value = '';
    }
}
// --- MODIFICAR VALORES DIRECTAMENTE EN LA BASE DE DATOS ---
async function modificarPago(id, campo, nuevoValor) {
    console.log(`✏️ [EDICIÓN] Modificando Venta ID #${id}. Pago ${campo} -> $${nuevoValor}`);
    
    const venta = ventas.find(v => v.id === id);
    if (!venta) {
        console.error(`❌ [EDICIÓN ERROR] No se encontró la venta local con ID #${id}`);
        return;
    }

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

    console.log(`📤 [ACTUALIZACIÓN CLOUD] Modificando ID #${id} en Supabase:`, datosActualizados);

    const { error } = await supabaseClient
        .from('ventas')
        .update(datosActualizados)
        .eq('id', id);

    if (error) {
        console.error(`❌ [ACTUALIZACIÓN ERROR] Falló la edición del ID #${id}:`, error);
    } else {
        console.log(`✅ [ACTUALIZACIÓN] Celda guardada en la nube para ID #${id}.`);
    }
}

// --- ELIMINAR VENTA CLOUD ---
async function eliminarVenta(id) {
    console.log(`🗑️ [SOLICITUD ELIMINACIÓN] Procesando ID #${id}`);
    if (confirm("¿Estás seguro de que deseas eliminar este registro permanentemente?")) {
        const { error } = await supabaseClient.from('ventas').delete().eq('id', id);
        if (error) {
            console.error(`❌ [BORRADO ERROR] Supabase rechazó la eliminación de ID #${id}:`, error);
            alert("Error al eliminar el registro.");
        } else {
            console.log(`✅ [BORRADO] ID #${id} eliminado con éxito de la nube.`);
        }
    }
}

// --- RENDERIZAR TABLA DE VENTAS ---
function renderVentas() {
    console.log("🎨 [UI RENDER] Dibujando la interfaz con los nuevos datos...");
    const tbody = document.querySelector('#ventasTable tbody');
    tbody.innerHTML = '';

    if (ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#888;">No hay ventas registradas en la nube.</td></tr>`;
        return;
    }

    ventas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${v.id}</td>
            <td><strong>${v.name}</strong></td>
            <td>$${parseFloat(v.cost).toFixed(2)}</td>
            <td>$${parseFloat(v.price).toFixed(2)}</td>
            <td>
                $<input type="number" step="0.01" value="${v.pago1}" 
                style="width:80px; padding:2px; border:1px solid #ccc; border-radius:4px;"
                onchange="modificarPago(${v.id}, 1, this.value)">
            </td>
            <td>
                $<input type="number" step="0.01" value="${v.pago2}" 
                style="width:80px; padding:2px; border:1px solid #ccc; border-radius:4px;"
                onchange="modificarPago(${v.id}, 2, this.value)">
            </td>
            <td>$${parseFloat(v.total_recibido).toFixed(2)}</td>
            <td style="color:${v.saldo > 0 ? 'var(--warning)' : 'inherit'}">$${parseFloat(v.saldo).toFixed(2)}</td>
            <td><span class="status ${v.status.toLowerCase()}">${v.status}</span></td>
            <td>
                <button class="btn-secondary action-btn" style="background-color:var(--danger); padding:4px 10px;" onclick="eliminarVenta(${v.id})">🗑️ Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- PROYECCIÓN A 10 SEMANAS ---
function generarProyeccion() {
    console.log("📊 [PROYECCIÓN] Iniciando simulación matemática...");
    const simCosto = parseFloat(document.getElementById('simCost').value);
    const simPrecio = parseFloat(document.getElementById('simPrice').value);

    if (isNaN(simCosto) || isNaN(simPrecio)) {
        console.warn("⚠️ [PROYECCIÓN] Parámetros numéricos inválidos.");
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
            console.warn(`🛑 [PROYECCIÓN PAUSADA] Quiebre de caja detectado en la Semana ${i}.`);
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
            <td style="color:var(--success)">+$${ahorroSemanal.toFixed(2)}</td>
            <td style="color:var(--danger)">-$${inv2Prod.toFixed(2)}</td>
            <td>$${abono1.toFixed(2)}</td>
            <td>$${abono2.toFixed(2)}</td>
            <td style="font-weight:bold; color:var(--secondary)">$${gananciaAcumulada.toFixed(2)}</td>
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

    let lineCaja = `<polyline points="${pointsCaja}" fill="none" stroke="#27ae60" stroke-width="3" />`;
    let lineGanancia = `<polyline points="${pointsGanancia}" fill="none" stroke="#e67e22" stroke-width="3" />`;

    let nodos = "";
    cajaData.forEach((val, idx) => {
        nodos += `<circle cx="${getX(idx)}" cy="${getY(val)}" r="4" fill="#27ae60" />`;
        nodos += `<circle cx="${getX(idx)}" cy="${getY(gananciaData[idx])}" r="4" fill="#e67e22" />`;
    });

    let ejes = `
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" stroke-width="1" />
    `;
    svg.innerHTML = ejes + lineCaja + lineGanancia + nodos;
    console.log("🎨 [PROYECCIÓN] Gráfico renderizado perfectamente.");
}

// UNICO DISPARADOR: SE ASEGURA DE QUE ESTA SEA LA ULTIMA LÍNEA DE TODO EL ARCHIVO JS
iniciarApp();

