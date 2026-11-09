document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const mesaId = parseInt(params.get('mesa')) || 1;

    const FACTOR_TIEMPO = (typeof FACTOR_TIEMPO_GLOBAL !== 'undefined') ? FACTOR_TIEMPO_GLOBAL : 1000;

    const indicadorMesa = document.getElementById('indicador-mesa');
    const contenedorMenu = document.getElementById('contenedor-menu');
    const vistaPedido = document.getElementById('vista-pedido');
    const listaEstadoPlatos = document.getElementById('lista-estado-platos');
    const etaGlobal = document.getElementById('eta-global');
    const badgeEstadoGeneral = document.getElementById('badge-estado-general');
    const modalFicha = document.getElementById('modal-ficha');

    indicadorMesa.textContent = `MESA 0${mesaId}`;

    // Guardar el estado de los desplegables abiertos y lo que escribe el cliente
    const borradoresResena = {};

    // 1. Renderizar la Carta Gourmet (Siempre visible)
    function renderizarCarta() {
        const menuActual = obtenerMenuDB();
        contenedorMenu.innerHTML = menuActual.map((plato, index) => {
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            const agotado = plato.activo === false;
            return `
                <div class="card" style="opacity: ${agotado ? '0.45' : '1'};" onclick="abrirFicha(${index}, '${num}')">
                    <div class="icon-wrapper">
                        <img src="${plato.img}" alt="${plato.nombre}" loading="lazy">
                    </div>
                    <div class="card-info">
                        <div class="card-number">PLATO #${num} ${agotado ? '· NO DISPONIBLE' : ''}</div>
                        <h3>${plato.nombre}</h3>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 2. Modal de Ficha Técnica
    window.abrirFicha = (index, num) => {
        const menuActual = obtenerMenuDB();
        const plato = menuActual[index];
        if (!plato) return;

        const nivelesTexto = { 1: 'Baja (Estándar)', 2: 'Media (Técnica)', 3: 'Alta (Especialidad)' };

        document.getElementById('modal-img').src = plato.img;
        document.getElementById('modal-num').textContent = `PLATO #${num}`;
        document.getElementById('modal-titulo').textContent = plato.nombre;
        document.getElementById('modal-desc').textContent = plato.descripcion;
        document.getElementById('modal-alergenos').textContent = plato.alergenos;
        document.getElementById('modal-tiempo').textContent = `${plato.tiempoBase} MINUTOS`;
        document.getElementById('modal-complejidad').textContent = nivelesTexto[plato.complejidad] || 'Media';

        modalFicha.classList.add('active');
    };

    window.cerrarModal = () => {
        modalFicha.classList.remove('active');
    };

    modalFicha.addEventListener('click', (e) => {
        if (e.target === modalFicha) cerrarModal();
    });

    // 3. Funciones del Desplegable de Calificación
    window.toggleDesplegableResena = (uidKey) => {
        if (!borradoresResena[uidKey]) {
            borradoresResena[uidKey] = { abierto: false, estrellas: 5, comentario: '', email: '', errorEmail: '' };
        }
        borradoresResena[uidKey].abierto = !borradoresResena[uidKey].abierto;
        actualizarEstadoPedidoCliente(true);
    };

    window.seleccionarEstrellaPlato = (uidKey, valor) => {
        if (!borradoresResena[uidKey]) {
            borradoresResena[uidKey] = { abierto: true, estrellas: 5, comentario: '', email: '', errorEmail: '' };
        }
        borradoresResena[uidKey].estrellas = valor;
        const contenedorEstrellas = document.getElementById(`stars-${uidKey}`);
        if (contenedorEstrellas) {
            contenedorEstrellas.querySelectorAll('.star-btn').forEach((btn, i) => {
                btn.classList.toggle('active', i < valor);
            });
        }
    };

    window.actualizarBorradorResena = (uidKey, campo, valor) => {
        if (!borradoresResena[uidKey]) {
            borradoresResena[uidKey] = { abierto: true, estrellas: 5, comentario: '', email: '', errorEmail: '' };
        }
        borradoresResena[uidKey][campo] = valor;
        if (campo === 'email') {
            borradoresResena[uidKey].errorEmail = '';
            const msgError = document.getElementById(`err-email-${uidKey}`);
            if (msgError) msgError.style.display = 'none';
        }
    };

    function esCorreoValido(correo) {
        if (!correo) return true; // Si lo deja vacío es válido (queda en blanco en Admin)
        // Debe contener '@' y al menos un '.' después del '@' sin espacios
        const partesArroba = correo.split('@');
        if (partesArroba.length !== 2 || !partesArroba[0] || !partesArroba[1]) return false;
        if (!partesArroba[1].includes('.')) return false;
        const partesPunto = partesArroba[1].split('.');
        if (partesPunto.some(p => p.length === 0)) return false;
        return true;
    }

    window.enviarCalificacionCliente = async (idxPlato, uidKey) => {
        const pedidos = obtenerPedidos();
        const pedidoMesa = pedidos[mesaId];
        if (!pedidoMesa || !pedidoMesa.platos[idxPlato]) return;

        const item = pedidoMesa.platos[idxPlato];
        const borrador = borradoresResena[uidKey] || { abierto: true, estrellas: 5, comentario: '', email: '' };
        const correoLimpio = (borrador.email || '').trim();

        // Validar que si ingresó un correo tenga obligatoriamente '@' y '.'
        if (correoLimpio !== '' && !esCorreoValido(correoLimpio)) {
            borrador.errorEmail = 'Ingresa un correo válido (debe contener "@" y ".") o déjalo vacío.';
            const msgError = document.getElementById(`err-email-${uidKey}`);
            if (msgError) {
                msgError.textContent = borrador.errorEmail;
                msgError.style.display = 'block';
            }
            return;
        }

        const btn = document.getElementById(`btn-rev-${uidKey}`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'ENVIANDO...';
        }

        const uidInstanciaReal = item.uid_instancia || uidKey;
        item.uid_instancia = uidInstanciaReal;

        const nuevaResena = await guardarResenaPlato({
            mesa: `Mesa 0${mesaId}`,
            uid_plato: uidInstanciaReal,
            id_plato: item.id_plato,
            plato: item.nombre,
            chef: item.chef_nombre || 'Chef Mateo',
            estrellas: borrador.estrellas,
            comentario: (borrador.comentario || '').trim(),
            email: correoLimpio
        });

        item.resena_enviada = true;
        item.estrellas_calificacion = borrador.estrellas;
        item.email_cliente = correoLimpio;
        item.comentario_cliente = (borrador.comentario || '').trim();
        item.datos_resena = nuevaResena;

        guardarTodosLosPedidos(pedidos);
        actualizarEstadoPedidoCliente(true);
    };

    // 4. Renderizar Estado del Pedido con Barra Progresiva y Etapas en Vivo
    function actualizarEstadoPedidoCliente(forzarRender = false) {
        const elementoActivo = document.activeElement;
        if (!forzarRender && elementoActivo && elementoActivo.classList && elementoActivo.classList.contains('review-input')) {
            return;
        }

        const pedidos = obtenerPedidos();
        const pedidoMesa = pedidos[mesaId];

        if (!pedidoMesa || !Array.isArray(pedidoMesa.platos) || pedidoMesa.platos.length === 0) {
            vistaPedido.classList.add('hidden');
            return;
        }

        vistaPedido.classList.remove('hidden');

        const menuActual = obtenerMenuDB();
        const resenasGuardadas = (typeof obtenerResenasDB === 'function') ? obtenerResenasDB() : [];
        const ahora = Date.now();
        let maxMinutosRestantes = 0;
        let todosEntregados = true;
        let algunoListoParaServir = false;
        let nivelDemoraMax = 0; // 0: normal, 1: amarillo, 2: naranja, 3: rojo

        listaEstadoPlatos.innerHTML = pedidoMesa.platos.map((item, idx) => {
            const platoInfo = menuActual.find(p => p.id === parseInt(item.id_plato));
            const numIndex = platoInfo ? menuActual.indexOf(platoInfo) + 1 : 0;
            const numTag = numIndex > 0 ? `#${numIndex < 10 ? '0' + numIndex : numIndex}` : '';

            const nivelChef = item.chef_nivel || 'experto';
            const etaMin = (typeof calcularETAChef === 'function')
                ? calcularETAChef(item.id_plato, nivelChef, 1.0)
                : (platoInfo ? platoInfo.tiempoBase : 15);

            const tiempoCreacion = item.timestamp_creacion || pedidoMesa.id || ahora;
            const tieneAlertaActiva = item.alerta_sala === true || item.estado === 'Problema Notificado';

            // Congelar tiempo si el cocinero activó la pausa en cocina
            const ahoraPlato = (tieneAlertaActiva && item.inicio_pausa) ? item.inicio_pausa : ahora;

            let etapaTexto = 'ORDEN TOMADA';
            let infoDerecha = `ESTIMADO: ${etaMin} MIN`;
            let fillClass = 'fill-normal';
            let cardClass = '';
            let porcentajeBarra = 5;
            let mensajeCliente = '';
            let claseMensaje = '';

            if (item.estado === 'Entregado') {
                porcentajeBarra = 100;
                fillClass = 'fill-entregado';
                etapaTexto = 'SERVIDO EN MESA';
                infoDerecha = 'COMPLETADO';
            } else if (item.estado === 'Servido') {
                todosEntregados = false;
                algunoListoParaServir = true;
                porcentajeBarra = 80;
                fillClass = 'fill-servido';
                etapaTexto = 'EMPLATADO TERMINADO · LLEVANDO A SU MESA';
                infoDerecha = 'ENTREGA INMEDIATA';
            } else if (item.inicio_coccion) {
                todosEntregados = false;
                const transcurridoMin = Math.max(0, (ahoraPlato - item.inicio_coccion) / FACTOR_TIEMPO);
                const ratio = Math.min(1, transcurridoMin / etaMin);
                const tiempoExtra = transcurridoMin - etaMin;

                porcentajeBarra = Math.min(78, 5 + Math.round(ratio * 73));

                if (ratio < 0.25) {
                    etapaTexto = 'INICIANDO PREPARACION';
                } else if (ratio < 0.65) {
                    etapaTexto = 'PREPARANDO';
                } else if (ratio < 0.85) {
                    etapaTexto = 'PREPARANDO ULTIMOS DETALLES';
                } else {
                    etapaTexto = 'EMPLATANDO';
                }

                const restanteMin = Math.max(1, Math.ceil(etaMin - transcurridoMin));
                if (restanteMin > maxMinutosRestantes && tiempoExtra <= 0) {
                    maxMinutosRestantes = restanteMin;
                }

                if (tieneAlertaActiva || tiempoExtra >= 25) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 3);
                    fillClass = 'fill-rojo';
                    cardClass = 'card-roja';
                    infoDerecha = 'ATENCION EN SALA';
                    mensajeCliente = 'Lamentamos la demora. Nuestro equipo está priorizando su orden en este momento.';
                    claseMensaje = 'msg-rojo';
                } else if (tiempoExtra >= 15) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 2);
                    fillClass = 'fill-naranja';
                    cardClass = 'card-naranja';
                    infoDerecha = 'ULTIMOS MINUTOS';
                    mensajeCliente = 'Estamos tardando un poco más de lo previsto, muchas gracias por su espera.';
                    claseMensaje = 'msg-naranja';
                } else if (tiempoExtra >= 5) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 1);
                    fillClass = 'fill-amarillo';
                    infoDerecha = 'AFINANDO DETALLES';
                    mensajeCliente = 'Cuidando cada detalle de su plato para garantizar la mejor experiencia.';
                    claseMensaje = 'msg-amarillo';
                } else {
                    infoDerecha = tiempoExtra <= 0 ? `RESTAN ~${restanteMin} MIN` : `EMPLATANDO`;
                }
            } else {
                todosEntregados = false;
                const esperaMin = Math.max(0, (ahoraPlato - tiempoCreacion) / FACTOR_TIEMPO);
                porcentajeBarra = 5;
                etapaTexto = 'ORDEN TOMADA';

                if (etaMin > maxMinutosRestantes) maxMinutosRestantes = etaMin;

                if (tieneAlertaActiva) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 3);
                    fillClass = 'fill-rojo';
                    cardClass = 'card-roja';
                    infoDerecha = 'ATENCION EN SALA';
                    mensajeCliente = 'Lamentamos la demora. Nuestro personal de sala le asistirá en breve con su orden.';
                    claseMensaje = 'msg-rojo';
                } else if (esperaMin >= 10) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 2);
                    fillClass = 'fill-naranja';
                    cardClass = 'card-naranja';
                    infoDerecha = `ESTIMADO: ~${etaMin} MIN`;
                    mensajeCliente = 'Estamos tardando un poco más de lo previsto en iniciar su plato, muchas gracias por su espera.';
                    claseMensaje = 'msg-naranja';
                } else {
                    infoDerecha = `ESTIMADO: ~${etaMin} MIN`;
                }
            }

            if (tieneAlertaActiva) {
                etapaTexto = 'PAUSA EN COCINA (ATENCION)';
            }

            // Desplegable de Calificación (Solo cuando el plato está en 'Entregado' = 100%)
            const uidKey = item.uid_instancia || `${pedidoMesa.id || 'ord'}_${mesaId}_${idx}`;
            let htmlResena = '';

            if (item.estado === 'Entregado') {
                const resenaRemota = resenasGuardadas.find(r => r.uid_plato === uidKey) || item.datos_resena;

                if (item.resena_enviada || resenaRemota) {
                    const numEstrellas = (resenaRemota && resenaRemota.estrellas) || item.estrellas_calificacion || 5;
                    const estrellasPintadas = '★'.repeat(numEstrellas) + '☆'.repeat(5 - numEstrellas);
                    const correoReg = (resenaRemota && resenaRemota.email) || item.email_cliente || '';

                    htmlResena = `
                        <div class="review-done-box">
                            <div class="review-done-header">
                                <strong>Calificación enviada</strong>
                                <span class="review-stars-static">${estrellasPintadas}</span>
                            </div>
                            ${correoReg ? `<p class="review-done-text">Te enviaremos nuestra respuesta y un descuento para tu próximo pedido a <strong>${correoReg}</strong>.</p>` : ''}
                        </div>
                    `;
                } else {
                    if (!borradoresResena[uidKey]) {
                        borradoresResena[uidKey] = { abierto: false, estrellas: 5, comentario: '', email: '', errorEmail: '' };
                    }
                    const borrador = borradoresResena[uidKey];
                    const botonesEstrellas = [1, 2, 3, 4, 5].map(num => `
                        <button type="button" class="star-btn ${num <= borrador.estrellas ? 'active' : ''}" onclick="seleccionarEstrellaPlato('${uidKey}', ${num})">★</button>
                    `).join('');

                    htmlResena = `
                        <div class="review-trigger-row">
                            <button type="button" class="btn-toggle-resena" onclick="toggleDesplegableResena('${uidKey}')">
                                ${borrador.abierto ? 'Cerrar Calificación ▲' : '★ Calificar Plato'}
                            </button>
                        </div>
                        <div class="review-box ${borrador.abierto ? '' : 'hidden'}">
                            <div class="review-header">
                                <span class="review-title">Tu opinión sobre este plato</span>
                                <span class="review-promo-badge">Ingresa tu correo para recibir un descuento en tu próximo pedido</span>
                            </div>
                            <div id="stars-${uidKey}" class="star-selector">
                                ${botonesEstrellas}
                            </div>
                            <div class="review-inputs-grid">
                                <input type="text" class="review-input" placeholder="Comentario opcional (sabor, término...)" value="${borrador.comentario.replace(/"/g, '&quot;')}" oninput="actualizarBorradorResena('${uidKey}', 'comentario', this.value)">
                                <input type="email" class="review-input" placeholder="Correo electrónico (opcional)" value="${borrador.email.replace(/"/g, '&quot;')}" oninput="actualizarBorradorResena('${uidKey}', 'email', this.value)">
                            </div>
                            <div id="err-email-${uidKey}" class="review-error-msg" style="display: ${borrador.errorEmail ? 'block' : 'none'};">
                                ${borrador.errorEmail || ''}
                            </div>
                            <button type="button" id="btn-rev-${uidKey}" class="btn-enviar-resena" onclick="enviarCalificacionCliente(${idx}, '${uidKey}')">
                                Enviar Calificación
                            </button>
                        </div>
                    `;
                }
            }

            return `
                <div class="order-status-card ${cardClass}">
                    <div class="order-item-top">
                        <span class="order-item-name"><strong>${numTag}</strong> ${item.nombre}</span>
                        <span class="order-item-pct">${infoDerecha}</span>
                    </div>
                    <div class="order-progress-track">
                        <div class="order-progress-fill ${fillClass}" style="width: ${porcentajeBarra}%;"></div>
                    </div>
                    <div class="order-item-stage">
                        <span>${etapaTexto}</span>
                        <span>${porcentajeBarra}%</span>
                    </div>
                    ${mensajeCliente ? `<div class="order-reassurance-msg ${claseMensaje}">${mensajeCliente}</div>` : ''}
                    ${item.notas ? `<div class="nota-especial">Especificación: ${item.notas}</div>` : ''}
                    ${htmlResena}
                </div>
            `;
        }).join('');

        // Actualizar cabecera general del pedido
        if (todosEntregados) {
            etaGlobal.textContent = 'TODOS SUS PLATOS HAN SIDO SERVIDOS EN MESA';
            badgeEstadoGeneral.textContent = 'DISFRUTANDO EN MESA';
            badgeEstadoGeneral.className = 'status-pill pill-comiendo';
        } else if (nivelDemoraMax === 3) {
            etaGlobal.textContent = 'LAMENTAMOS LA DEMORA · SU ORDEN TIENE PRIORIDAD EN COCINA';
            badgeEstadoGeneral.textContent = 'PRIORIDAD ACTIVA';
            badgeEstadoGeneral.className = 'status-pill pill-roja';
        } else if (nivelDemoraMax === 2) {
            etaGlobal.textContent = 'ESTAMOS TARDANDO UN POCO MAS · MUCHAS GRACIAS POR SU ESPERA';
            badgeEstadoGeneral.textContent = 'PREPARACION AVANZADA';
            badgeEstadoGeneral.className = 'status-pill pill-naranja';
        } else if (algunoListoParaServir) {
            etaGlobal.textContent = 'PLATOS TERMINADOS EN CAMINO A SU MESA';
            badgeEstadoGeneral.textContent = 'SIRVIENDO';
            badgeEstadoGeneral.className = 'status-pill pill-servido';
        } else {
            const textoEta = maxMinutosRestantes > 0
                ? `TIEMPO ESTIMADO RESTANTE: ~${maxMinutosRestantes} MINUTOS`
                : `PREPARANDO ULTIMOS DETALLES DE SU ORDEN`;
            etaGlobal.textContent = textoEta;
            badgeEstadoGeneral.textContent = 'EN PREPARACION';
            badgeEstadoGeneral.className = 'status-pill pill-proceso';
        }
    }

    setInterval(() => actualizarEstadoPedidoCliente(false), 1000);

    function sincronizarVistaCliente() {
        renderizarCarta();
        actualizarEstadoPedidoCliente(false);
    }

    window.addEventListener('storage', sincronizarVistaCliente);
    window.addEventListener('gastroflow:update', sincronizarVistaCliente);

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = sincronizarVistaCliente;
    }

    renderizarCarta();
    actualizarEstadoPedidoCliente(true);
});