document.addEventListener('DOMContentLoaded', () => {
    requerirRol('camarero');

    const sesion = obtenerSesionPersonal();
    if (sesion) {
        document.getElementById('user-display').textContent = sesion.nombre;
    }

    const gridMesas = document.getElementById('grid-mesas');
    const modalComanda = document.getElementById('modal-comanda');
    const modalMesaSubtitle = document.getElementById('modal-mesa-subtitle');
    const selectPlato = document.getElementById('select-plato');
    const inputNotas = document.getElementById('input-notas');
    const listaPlatosActivos = document.getElementById('lista-platos-activos');
    const gridNumerosRapidos = document.getElementById('grid-numeros-rapidos');
    const btnConfirmarComanda = document.querySelector('.modal-footer .btn-primary');

    let mesaSeleccionada = null;
    let comandaTemporal = [];
    let huboCambiosEnComanda = false;

    function actualizarEstadoBotonConfirmar() {
        if (!btnConfirmarComanda) return;
        const habilitar = comandaTemporal.length > 0 && huboCambiosEnComanda;
        btnConfirmarComanda.disabled = !habilitar;
    }

    function cargarOpcionesMenu() {
        selectPlato.innerHTML = '';
        gridNumerosRapidos.innerHTML = '';

        menuGlobal.forEach((plato, index) => {
            const numFormateado = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;

            const option = document.createElement('option');
            option.value = plato.id;
            option.textContent = `#${numFormateado} - ${plato.nombre} (${plato.tiempoBase} min)`;
            selectPlato.appendChild(option);

            const numBtn = document.createElement('button');
            numBtn.type = 'button';
            numBtn.className = 'num-btn';
            numBtn.textContent = `#${numFormateado}`;
            numBtn.onclick = () => seleccionarPlatoPorNumero(plato.id, numBtn);
            gridNumerosRapidos.appendChild(numBtn);
        });
    }

    function seleccionarPlatoPorNumero(platoId, btnElement) {
        selectPlato.value = platoId;
        document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
        if (btnElement) btnElement.classList.add('selected');
    }

    function renderizarMesas() {
        const pedidos = obtenerPedidos();
        gridMesas.innerHTML = '';

        for (let i = 1; i <= 5; i++) {
            const pedidoMesa = pedidos[i];
            const estaOcupada = pedidoMesa && pedidoMesa.platos && pedidoMesa.platos.length > 0;
            const platos = estaOcupada ? pedidoMesa.platos : [];
            const cantidadPlatos = platos.length;

            let hayProblema = false;
            let platosPorEntregar = 0;
            let platosEntregados = 0;

            platos.forEach(p => {
                if (p.alerta_sala === true || p.estado === 'Problema Notificado') hayProblema = true;
                if (p.estado === 'Servido') platosPorEntregar++;
                if (p.estado === 'Entregado') platosEntregados++;
            });

            let claseCardExtra = '';
            let badgeClass = 'status-libre';
            let badgeTexto = 'LIBRE';
            let footerTexto = 'Disponible para comanda';

            if (estaOcupada) {
                if (hayProblema) {
                    claseCardExtra = 'mesa-alerta';
                    badgeClass = 'status-alerta';
                    badgeTexto = 'ALERTA COCINA';
                    footerTexto = 'Revisar novedad reportada por el chef';
                } else if (platosPorEntregar > 0) {
                    claseCardExtra = 'mesa-azul';
                    badgeClass = 'status-azul-entregar';
                    badgeTexto = 'POR ENTREGAR';
                    footerTexto = `${platosPorEntregar} plato(s) listos en cocina`;
                } else if (platosEntregados === cantidadPlatos) {
                    claseCardExtra = 'mesa-amarilla';
                    badgeClass = 'status-amarillo-comiendo';
                    badgeTexto = 'COMIENDO';
                    footerTexto = `${cantidadPlatos} plato(s) servidos - Listo para cobrar`;
                } else {
                    badgeClass = 'status-ocupada';
                    badgeTexto = 'EN COCINA';
                    footerTexto = `${cantidadPlatos} plato(s) en orden`;
                }
            }

            const card = document.createElement('div');
            card.className = `mesa-card ${claseCardExtra}`;
            card.onclick = () => abrirModalComanda(i);

            card.innerHTML = `
                <div class="mesa-header">
                    <span class="mesa-num">MESA 0${i}</span>
                    <span class="status-indicator ${badgeClass}">
                        ${badgeTexto}
                    </span>
                </div>
                <div class="mesa-footer">
                    ${footerTexto}
                </div>
            `;
            gridMesas.appendChild(card);
        }
    }

    function abrirModalComanda(mesaId) {
        mesaSeleccionada = mesaId;
        modalMesaSubtitle.textContent = `MESA 0${mesaId}`;

        const pedidos = obtenerPedidos();
        const pedidoExistente = pedidos[mesaId];

        comandaTemporal = pedidoExistente && pedidoExistente.platos ? JSON.parse(JSON.stringify(pedidoExistente.platos)) : [];
        huboCambiosEnComanda = false;
        actualizarEstadoBotonConfirmar();

        renderizarListaComandaTemporal();
        document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
        modalComanda.classList.remove('hidden');
    }

    window.cerrarModalComanda = () => {
        modalComanda.classList.add('hidden');
        mesaSeleccionada = null;
        comandaTemporal = [];
        huboCambiosEnComanda = false;
        inputNotas.value = '';
    };

    function renderizarListaComandaTemporal() {
        if (comandaTemporal.length === 0) {
            listaPlatosActivos.innerHTML = `<p class="empty-state">No hay platos en esta mesa.</p>`;
            return;
        }

        listaPlatosActivos.innerHTML = comandaTemporal.map((item, index) => {
            const platoOriginal = menuGlobal.find(p => p.id === item.id_plato);
            const numIndex = menuGlobal.indexOf(platoOriginal) + 1;
            const numTag = numIndex > 0 ? `#${numIndex < 10 ? '0' + numIndex : numIndex}` : '';

            const tieneAlerta = item.alerta_sala === true || item.estado === 'Problema Notificado';

            let estadoBadge = `<span class="badge-mini bm-espera">Iniciando</span>`;
            // El camarero siempre puede eliminar/cancelar platos si el cliente no los quiso o se fue
            let botonAccion = `<button class="btn-remove-item" onclick="quitarPlatoTemporal(${index})" title="Eliminar plato">&times;</button>`;

            if (tieneAlerta) {
                estadoBadge = `<span class="badge-mini bm-alerta">Alerta Cocina</span>`;
            } else if (item.estado === 'Cocinando') {
                estadoBadge = `<span class="badge-mini bm-fuego">Preparando</span>`;
            } else if (item.estado === 'Servido') {
                estadoBadge = `<span class="badge-mini bm-servido">Por Entregar</span>`;
                botonAccion = `<button class="btn-mini-accion btn-llevar" onclick="marcarEntregadoAMesa(${index})">Pedido Entregado</button>`;
            } else if (item.estado === 'Entregado') {
                estadoBadge = `<span class="badge-mini bm-entregado">Comiendo</span>`;
                botonAccion = `<button class="btn-remove-item" onclick="quitarPlatoTemporal(${index})" title="Eliminar plato">&times;</button>`;
            }

            return `
                <div class="item-row">
                    <div>
                        <div class="item-title">
                            <span class="item-num-tag">${numTag}</span>${item.nombre}
                            ${estadoBadge}
                        </div>
                        ${item.notas ? `<div class="item-note">Nota: ${item.notas}</div>` : ''}
                        ${tieneAlerta && item.motivo_alerta ? `<div class="item-alert-reason">Aviso Cocina: ${item.motivo_alerta}</div>` : ''}
                    </div>
                    ${botonAccion}
                </div>
            `;
        }).join('');
    }

    window.marcarEntregadoAMesa = (index) => {
        comandaTemporal[index].estado = 'Entregado';
        comandaTemporal[index].alerta_sala = false;
        
        huboCambiosEnComanda = true;
        actualizarEstadoBotonConfirmar();
        renderizarListaComandaTemporal();
    };

    window.agregarPlatoAComanda = () => {
        const platoId = parseInt(selectPlato.value);
        const platoObj = menuGlobal.find(p => p.id === platoId);
        const notasText = inputNotas.value.trim();

        if (!platoObj) return;

        comandaTemporal.push({
            id_plato: platoObj.id,
            nombre: platoObj.nombre,
            notas: notasText,
            estado: 'En preparación',
            timestamp_creacion: Date.now()
        });

        huboCambiosEnComanda = true;
        actualizarEstadoBotonConfirmar();

        inputNotas.value = '';
        document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
        renderizarListaComandaTemporal();
    };

    window.quitarPlatoTemporal = (index) => {
        const plato = comandaTemporal[index];
        if (!plato) return;

        if (confirm(`¿Estás seguro de eliminar el plato "${plato.nombre}" de la comanda?`)) {
            comandaTemporal.splice(index, 1);
            huboCambiosEnComanda = true;
            actualizarEstadoBotonConfirmar();
            renderizarListaComandaTemporal();
        }
    };

    window.guardarYEnviarComanda = () => {
        if (!mesaSeleccionada || !huboCambiosEnComanda) return;

        const nuevoPedido = comandaTemporal.length > 0 ? {
            id: Date.now(),
            platos: comandaTemporal
        } : null;

        actualizarPedidoMesa(mesaSeleccionada, nuevoPedido);
        cerrarModalComanda();
        renderizarMesas();
    };

    window.liberarMesaActual = () => {
        if (!mesaSeleccionada) return;

        // Si hay cambios en la comanda temporal (platos eliminados en la vista actual), evaluamos esos
        const platosAEvaluar = huboCambiosEnComanda ? comandaTemporal : (obtenerPedidos()[mesaSeleccionada]?.platos || []);

        const tienePlatosActivos = platosAEvaluar.some(p => p.estado !== 'Entregado');

        if (platosAEvaluar.length > 0 && tienePlatosActivos) {
            alert(`No se puede liberar la Mesa 0${mesaSeleccionada}.\n\nHay pedidos iniciados o en cocina. Si los clientes se fueron sin elegir o sin comer, debes eliminar cada plato de la comanda primero.`);
            return;
        }

        const mensajeConfirmacion = platosAEvaluar.length === 0
            ? `¿Deseas limpiar y liberar la Mesa 0${mesaSeleccionada} (Sin pedidos)?`
            : `¿Los comensales de la Mesa 0${mesaSeleccionada} han terminado? Se cobrará la cuenta y se liberará la mesa.`;

        if (confirm(mensajeConfirmacion)) {
            actualizarPedidoMesa(mesaSeleccionada, null);
            cerrarModalComanda();
            renderizarMesas();
        }
    };

    function sincronizarVistaCamarero() {
        renderizarMesas();
        if (mesaSeleccionada && !huboCambiosEnComanda) {
            const pedidos = obtenerPedidos();
            const pedidoExistente = pedidos[mesaSeleccionada];
            comandaTemporal = pedidoExistente && pedidoExistente.platos ? JSON.parse(JSON.stringify(pedidoExistente.platos)) : [];
            renderizarListaComandaTemporal();
        }
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'gastroflow_pedidos' || !e.key) sincronizarVistaCamarero();
    });

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = () => sincronizarVistaCamarero();
    }

    cargarOpcionesMenu();
    renderizarMesas();
});