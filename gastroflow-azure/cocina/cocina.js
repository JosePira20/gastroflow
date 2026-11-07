document.addEventListener('DOMContentLoaded', () => {
    requerirRol('cocinero');

    const FACTOR_TIEMPO = (typeof FACTOR_TIEMPO_GLOBAL !== 'undefined') ? FACTOR_TIEMPO_GLOBAL : 1000;
    const LIMITE_ESPERA_COLA_MIN = 10;

    const sesion = obtenerSesionPersonal();
    const nivelChef = (sesion && sesion.nivel) ? sesion.nivel : 'experto';
    const rendimientoChef = (sesion && sesion.rendimiento) ? sesion.rendimiento : 1.0;

    if (sesion) {
        document.getElementById('user-display').textContent = sesion.nombre;
    }
    document.getElementById('badge-nivel').textContent = `CHEF ${nivelChef.toUpperCase()}`;

    const listaEspera = document.getElementById('lista-espera');
    const listaFuego = document.getElementById('lista-fuego');
    const countEspera = document.getElementById('count-espera');
    const countFuego = document.getElementById('count-fuego');
    const modalRetraso = document.getElementById('modal-retraso');

    let platoEnEmergencia = null;

    function renderizarCocina() {
        const pedidos = obtenerPedidos();
        let htmlEspera = '';
        let htmlFuego = '';
        let cEspera = 0;
        let cFuego = 0;
        const ahora = Date.now();

        for (let mesaId = 1; mesaId <= 5; mesaId++) {
            const pedidoMesa = pedidos[mesaId];
            if (!pedidoMesa || !Array.isArray(pedidoMesa.platos)) continue;

            pedidoMesa.platos.forEach((plato, index) => {
                if (plato.estado === 'Servido' || plato.estado === 'Entregado') return;

                const platoInfo = menuGlobal.find(p => p.id === parseInt(plato.id_plato));
                const numIndex = platoInfo ? menuGlobal.indexOf(platoInfo) + 1 : 0;
                const numTag = numIndex > 0 ? `#${numIndex < 10 ? '0' + numIndex : numIndex}` : '';

                const etaMinutos = calcularETAChef(plato.id_plato, nivelChef, rendimientoChef);
                const tiempoInicio = plato.inicio_coccion || null;
                const tiempoCreacion = plato.timestamp_creacion || pedidoMesa.id || ahora;
                const tieneAlerta = plato.alerta_sala === true || plato.estado === 'Problema Notificado';

                const ahoraEfectivo = (tieneAlerta && plato.inicio_pausa) ? plato.inicio_pausa : ahora;

                let estadoColor = 'azul';
                let formatoTiempo = '';

                if (!tiempoInicio) {
                    const esperaColaMin = Math.max(0, (ahoraEfectivo - tiempoCreacion) / FACTOR_TIEMPO);
                    if (tieneAlerta) {
                        estadoColor = 'rojo';
                    } else if (esperaColaMin >= LIMITE_ESPERA_COLA_MIN) {
                        estadoColor = 'naranja';
                    }

                    const baseTexto = esperaColaMin >= LIMITE_ESPERA_COLA_MIN
                        ? `DEMORA: ${Math.floor(esperaColaMin)} MIN (ETA: ${etaMinutos}m)`
                        : `ETA: ${etaMinutos} MIN`;
                    formatoTiempo = tieneAlerta ? `PAUSA · ${baseTexto}` : baseTexto;
                } else {
                    const tiempoTranscurridoMin = Math.max(0, (ahoraEfectivo - tiempoInicio) / FACTOR_TIEMPO);
                    const tiempoExtra = tiempoTranscurridoMin - etaMinutos;

                    if (tiempoExtra >= 25 || plato.alerta_roja_inmediata || tieneAlerta) {
                        estadoColor = 'rojo';
                    } else if (tiempoExtra >= 15) {
                        estadoColor = 'naranja';
                    } else if (tiempoExtra >= 5) {
                        estadoColor = 'amarillo';
                    }

                    const superoLimite = (tiempoExtra >= 30) || (plato.limite_extra_ms && ahoraEfectivo >= plato.limite_extra_ms);

                    if (superoLimite && !tieneAlerta && !plato.alerta_ignorada && !platoEnEmergencia) {
                        mostrarAlertaCritica(mesaId, index, plato.nombre);
                    }

                    if (tiempoExtra > 0) {
                        formatoTiempo = `+${Math.floor(tiempoExtra)} MIN EXTRAS (ETA: ${etaMinutos}m)`;
                    } else {
                        const restantes = Math.max(0, Math.ceil(etaMinutos - tiempoTranscurridoMin));
                        formatoTiempo = `${restantes} MIN RESTANTES (ETA: ${etaMinutos}m)`;
                    }

                    if (tieneAlerta) {
                        formatoTiempo = `PAUSA · ${formatoTiempo}`;
                    }
                }

                const ticketHTML = `
                    <div class="ticket status-${estadoColor}">
                        <div class="ticket-header">
                            <span class="ticket-mesa">MESA 0${mesaId}</span>
                            <span class="ticket-timer timer-${estadoColor}">${formatoTiempo}</span>
                        </div>
                        <div class="ticket-plato"><strong>${numTag}</strong> ${plato.nombre}</div>
                        ${plato.notas ? `<div class="ticket-nota">Nota: ${plato.notas}</div>` : ''}
                        ${tieneAlerta ? `<div class="ticket-nota" style="background:#450a0a; color:#f87171; border-color:#7f1d1d;">ALERTA ACTIVA (TIEMPO EN PAUSA): ${plato.motivo_alerta || 'Novedad reportada'}</div>` : ''}

                        <div class="ticket-actions">
                            ${!tiempoInicio ?
                                `<button class="btn-ticket btn-start" onclick="iniciarPlato(${mesaId}, ${index})">Iniciar Preparacion</button>` :
                                `<button class="btn-ticket btn-done" onclick="servirPlato(${mesaId}, ${index})">Plato Servido</button>`
                            }
                            <button class="btn-ticket btn-alert-manual ${tieneAlerta ? 'alerta-activa-btn' : ''}" onclick="enviarAlertaDirecta(${mesaId}, ${index})">
                                ${tieneAlerta ? 'Quitar Alerta' : 'Alerta Sala'}
                            </button>
                            <button class="btn-ticket btn-cancel-mini" onclick="cancelarPlatoDirecto(${mesaId}, ${index})" title="Cancelar este pedido">Cancelar</button>
                        </div>
                    </div>
                `;

                if (!tiempoInicio) {
                    htmlEspera += ticketHTML;
                    cEspera++;
                } else {
                    htmlFuego += ticketHTML;
                    cFuego++;
                }
            });
        }

        listaEspera.innerHTML = htmlEspera || '<p class="empty-msg">No hay órdenes pendientes en cola.</p>';
        listaFuego.innerHTML = htmlFuego || '<p class="empty-msg">No hay platos en preparación.</p>';
        countEspera.textContent = cEspera;
        countFuego.textContent = cFuego;
    }

    window.iniciarPlato = (mesaId, index) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[index]) return;

        const plato = pedidos[mesaId].platos[index];
        plato.estado = 'Cocinando';
        plato.inicio_coccion = Date.now();
        plato.alerta_ignorada = false;

        if (plato.alerta_sala === true || plato.estado === 'Problema Notificado') {
            plato.inicio_pausa = Date.now();
        }

        guardarTodosLosPedidos(pedidos);
        renderizarCocina();
    };

    window.servirPlato = (mesaId, index) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[index]) return;

        pedidos[mesaId].platos[index].estado = 'Servido';
        pedidos[mesaId].platos[index].alerta_sala = false;
        pedidos[mesaId].platos[index].inicio_pausa = null;
        pedidos[mesaId].platos[index].motivo_alerta = null;

        if (platoEnEmergencia && platoEnEmergencia.mesaId === mesaId && platoEnEmergencia.indexPlato === index) {
            modalRetraso.classList.add('hidden');
            platoEnEmergencia = null;
        }
        guardarTodosLosPedidos(pedidos);
        renderizarCocina();
    };

    window.enviarAlertaDirecta = (mesaId, index) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[index]) return;

        const plato = pedidos[mesaId].platos[index];
        const tieneAlerta = plato.alerta_sala === true || plato.estado === 'Problema Notificado';

        if (tieneAlerta) {
            const ahora = Date.now();
            if (plato.inicio_pausa) {
                const duracionPausaMs = ahora - plato.inicio_pausa;
                if (plato.inicio_coccion) {
                    plato.inicio_coccion += duracionPausaMs;
                }
                if (plato.timestamp_creacion) {
                    plato.timestamp_creacion += duracionPausaMs;
                }
                if (plato.limite_extra_ms) {
                    plato.limite_extra_ms += duracionPausaMs;
                }
            }

            plato.alerta_sala = false;
            plato.inicio_pausa = null;
            plato.motivo_alerta = null;
            if (plato.estado === 'Problema Notificado') {
                plato.estado = plato.inicio_coccion ? 'Cocinando' : 'En preparación';
            }

            guardarTodosLosPedidos(pedidos);
            renderizarCocina();
        } else {
            const motivo = prompt(`Indica el motivo de la alerta para ${plato.nombre} (Mesa 0${mesaId}):`, "Falta ingrediente / Demora en cocción");

            if (motivo !== null) {
                plato.alerta_sala = true;
                plato.inicio_pausa = Date.now();
                plato.motivo_alerta = motivo.trim() || "Inconveniente reportado en cocina";
                guardarTodosLosPedidos(pedidos);
                renderizarCocina();
            }
        }
    };

    window.cancelarPlatoDirecto = (mesaId, index) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[index]) return;

        const nombrePlato = pedidos[mesaId].platos[index].nombre;
        const confirmar = confirm(`¿Estás seguro de que deseas CANCELAR y eliminar el pedido "${nombrePlato}" de la MESA 0${mesaId}?\n\nEsta acción quitará el plato de la orden.`);

        if (confirmar) {
            pedidos[mesaId].platos.splice(index, 1);
            if (pedidos[mesaId].platos.length === 0) {
                pedidos[mesaId] = null;
            }
            if (platoEnEmergencia && platoEnEmergencia.mesaId === mesaId && platoEnEmergencia.indexPlato === index) {
                modalRetraso.classList.add('hidden');
                platoEnEmergencia = null;
            }
            guardarTodosLosPedidos(pedidos);
            renderizarCocina();
        }
    };

    function mostrarAlertaCritica(mesaId, indexPlato, nombrePlato) {
        platoEnEmergencia = { mesaId, indexPlato };
        document.getElementById('modal-nombre-plato').textContent = nombrePlato;
        document.getElementById('modal-mesa').textContent = `MESA 0${mesaId}`;
        modalRetraso.classList.remove('hidden');
    }

    window.adicionarTiempo = (minutos) => {
        if (!platoEnEmergencia) return;
        const minPermitidos = Math.min(minutos, 15);
        const pedidos = obtenerPedidos();
        const { mesaId, indexPlato } = platoEnEmergencia;

        if (pedidos[mesaId] && pedidos[mesaId].platos[indexPlato]) {
            pedidos[mesaId].platos[indexPlato].inicio_coccion += (minPermitidos * FACTOR_TIEMPO);
            pedidos[mesaId].platos[indexPlato].limite_extra_ms = Date.now() + (minPermitidos * FACTOR_TIEMPO);
            pedidos[mesaId].platos[indexPlato].alerta_roja_inmediata = true;
            guardarTodosLosPedidos(pedidos);
        }

        modalRetraso.classList.add('hidden');
        platoEnEmergencia = null;
        renderizarCocina();
    };

    window.notificarProblemaCamarero = () => {
        if (!platoEnEmergencia) return;
        const pedidos = obtenerPedidos();
        const { mesaId, indexPlato } = platoEnEmergencia;

        if (pedidos[mesaId] && pedidos[mesaId].platos[indexPlato]) {
            pedidos[mesaId].platos[indexPlato].alerta_sala = true;
            pedidos[mesaId].platos[indexPlato].inicio_pausa = Date.now();
            pedidos[mesaId].platos[indexPlato].motivo_alerta = 'Tiempo crítico excedido en preparación';
            guardarTodosLosPedidos(pedidos);
        }

        modalRetraso.classList.add('hidden');
        platoEnEmergencia = null;
        renderizarCocina();
    };

    window.cancelarPlatoDesdeModal = () => {
        if (!platoEnEmergencia) return;
        const { mesaId, indexPlato } = platoEnEmergencia;
        cancelarPlatoDirecto(mesaId, indexPlato);
    };

    window.cerrarAlerta = () => {
        if (!platoEnEmergencia) return;
        const confirmacion = confirm("¿Deseas cerrar esta ventana de advertencia?\n\nAceptar: Cerrar ventana para continuar o marcar el plato como Servido.\nCancelar: Permanecer en la ventana.");

        if (confirmacion) {
            const pedidos = obtenerPedidos();
            const { mesaId, indexPlato } = platoEnEmergencia;

            if (pedidos[mesaId] && pedidos[mesaId].platos[indexPlato]) {
                pedidos[mesaId].platos[indexPlato].alerta_ignorada = true;
                guardarTodosLosPedidos(pedidos);
            }

            modalRetraso.classList.add('hidden');
            platoEnEmergencia = null;
            renderizarCocina();
        }
    };

    setInterval(renderizarCocina, 1000);

    window.addEventListener('storage', (e) => {
        if (e.key === 'gastroflow_pedidos' || !e.key) renderizarCocina();
    });

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = () => renderizarCocina();
    }

    renderizarCocina();
});