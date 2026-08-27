// --- ESTADO DE LA APLICACIÓN (Cargar desde localStorage si existen datos) ---
let ventas = JSON.parse(localStorage.getItem('ventas_sistema')) || [];
let idContador = ventas.length > 0 ? Math.max(...ventas.map(v => v.id)) + 1 : 1;

// --- FUNCIÓN PARA GUARDAR EN LOCALSTORAGE ---
function guardarEnAlmacenamiento() {
    localStorage.setItem('ventas_sistema', JSON.stringify(ventas));
}

// --- REGISTRAR VENTA REAL ---
function agregarVenta() {
    const name = document.getElementById('prodName').value;
    const cost = parseFloat(document.getElementById('prodCost').value);
    const price = parseFloat(document.getElementById('prodPrice').value);
    const pago1 = parseFloat(document.getElementById('prodPago1').value);

    if (!name || isNaN(cost) || isNaN(price) || isNaN(pago1)) {
        alert("Por favor rellena todos los campos correctamente.");
        return;
    }

    const saldo = price - pago1;
    const venta = {
        id: idContador++,
        name: name,
        cost: cost,
        price: price,
        pago1: pago1,
        pago2: 0,
        totalRecibido: pago1,
        saldo: saldo,
        status: saldo <= 0 ? 'Pagado' : 'Pendiente'
    };

    ventas.push(venta);
    guardarEnAlmacenamiento();
    renderVentas();
    document.getElementById('prodName').value = '';
}

// --- ACTUALIZAR ABONOS EDICIÓN DIRECTA ---
function modificarPago(id, campo, nuevoValor) {
    const venta = ventas.find(v => v.id === id);
    if (venta) {
        const valorNumerico = parseFloat(nuevoValor) || 0;
        
        if (campo === 1) venta.pago1 = valorNumerico;
        if (campo === 2) venta.pago2 = valorNumerico;

        // Recalcular métricas de la fila modificada
        venta.totalRecibido = venta.pago1 + venta.pago2;
        venta.saldo = venta.price - venta.totalRecibido;
        venta.status = venta.saldo <= 0 ? 'Pagado' : 'Pendiente';

        guardarEnAlmacenamiento();
        renderVentas();
    }
}

// --- ELIMINAR REGISTRO DE VENTA ---
function eliminarVenta(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de venta?")) {
        ventas = ventas.filter(v => v.id !== id);
        guardarEnAlmacenamiento();
        renderVentas();
    }
}

// --- RENDERIZAR HISTÓRICO CON EDICIÓN HABILITADA ---
function renderVentas() {
    const tbody = document.querySelector('#ventasTable tbody');
    tbody.innerHTML = '';

    if(ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#888;">No hay ventas registradas aún.</td></tr>`;
        return;
    }

    ventas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${v.id}</td>
            <td><strong>${v.name}</strong></td>
            <td>$${v.cost.toFixed(2)}</td>
            <td>$${v.price.toFixed(2)}</td>
            
            <!-- Celdas editables con entrada numérica directa -->
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
            
            <td>$${v.totalRecibido.toFixed(2)}</td>
            <td style="color:${v.saldo > 0 ? 'var(--warning)' : 'inherit'}">$${v.saldo.toFixed(2)}</td>
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

// --- RENDER DE GRÁFICO SVG ---
function dibujarGraficoSVG(cajaData, gananciaData) {
    const svg = document.getElementById('svgChart');
    svg.innerHTML = '';

    const maxVal = Math.max(...cajaData, ...gananciaData, 100);
    const padding = 40;
    const width = 500;
    const height = 300;

    const getX = (index) => padding + (index * (width - padding * 2) / 9);
    const getY = (val) => height - padding - (val * (height - padding * 2) / maxVal);

    let pointsCaja = "";
    let pointsGanancia = "";

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
}

renderVentas();
