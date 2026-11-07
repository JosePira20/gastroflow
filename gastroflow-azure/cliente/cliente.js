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
        const plato = menuGlobal[index];
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

    // 3. Renderizar Estado del Pedido con Barra Progresiva y Etapas en Vivo
    function actualizarEstadoPedidoCliente() {
        const pedidos = obtenerPedidos();
        const pedidoMesa = pedidos[mesaId];

        if (!pedidoMesa || !Array.isArray(pedidoMesa.platos) || pedidoMesa.platos.length === 0) {
            vistaPedido.classList.add('hidden');
            return;
        }

        vistaPedido.classList.remove('hidden');

        const ahora = Date.now();
        let maxMinutosRestantes = 0;
        let todosEntregados = true;
        let algunoListoParaServir = false;
        let nivelDemoraMax = 0; // 0: normal, 1: amarillo, 2: naranja, 3: rojo

        listaEstadoPlatos.innerHTML = pedidoMesa.platos.map(item => {
            const platoInfo = menuGlobal.find(p => p.id === parseInt(item.id_plato));
            const numIndex = platoInfo ? menuGlobal.indexOf(platoInfo) + 1 : 0;
            const numTag = numIndex > 0 ? `#${numIndex < 10 ? '0' + numIndex : numIndex}` : '';

            const etaMin = (typeof calcularETAChef === 'function')
                ? calcularETAChef(item.id_plato, 'experto', 1.0)
                : (platoInfo ? platoInfo.tiempoBase : 15);

            const tiempoCreacion = item.timestamp_creacion || pedidoMesa.id || ahora;
            const tieneAlertaActiva = item.alerta_sala === true || item.estado === 'Problema Notificado';

            // Congelar tiempo si el cocinero activó la pausa en cocina
            const ahoraPlato = (tieneAlertaActiva && item.inicio_pausa) ? item.inicio_pausa : ahora;

            let etapaTexto = 'INICIANDO PREPARACION';
            let infoDerecha = `ESTIMADO: ${etaMin} MIN`;
            let fillClass = 'fill-normal';
            let cardClass = '';
            let porcentajeBarra = 8;
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
                porcentajeBarra = 100;
                fillClass = 'fill-servido';
                etapaTexto = 'EMPLATADO TERMINADO · LLEVANDO A SU MESA';
                infoDerecha = 'ENTREGA INMEDIATA';
            } else if (item.inicio_coccion) {
                todosEntregados = false;
                const transcurridoMin = Math.max(0, (ahoraPlato - item.inicio_coccion) / FACTOR_TIEMPO);
                const ratio = transcurridoMin / etaMin;
                const tiempoExtra = transcurridoMin - etaMin;

                if (ratio < 0.25) {
                    etapaTexto = 'INICIANDO PREPARACION';
                    porcentajeBarra = Math.max(10, Math.round(ratio * 100));
                } else if (ratio < 0.65) {
                    etapaTexto = 'PREPARANDO';
                    porcentajeBarra = Math.round(ratio * 100);
                } else if (ratio < 0.85) {
                    etapaTexto = 'PREPARANDO ULTIMOS DETALLES';
                    porcentajeBarra = Math.round(ratio * 100);
                } else {
                    etapaTexto = 'EMPLATANDO';
                    porcentajeBarra = Math.min(96, Math.round(ratio * 100));
                }

                const restanteMin = Math.max(1, Math.ceil(etaMin - transcurridoMin));
                if (restanteMin > maxMinutosRestantes && tiempoExtra <= 0) {
                    maxMinutosRestantes = restanteMin;
                }

                if (tieneAlertaActiva || tiempoExtra >= 25) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 3);
                    fillClass = 'fill-rojo';
                    cardClass = 'card-roja';
                    porcentajeBarra = 96;
                    infoDerecha = 'ATENCION EN SALA';
                    mensajeCliente = 'Lamentamos la demora. Nuestro equipo está priorizando su orden en este momento.';
                    claseMensaje = 'msg-rojo';
                } else if (tiempoExtra >= 15) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 2);
                    fillClass = 'fill-naranja';
                    cardClass = 'card-naranja';
                    porcentajeBarra = 95;
                    infoDerecha = 'ULTIMOS MINUTOS';
                    mensajeCliente = 'Estamos tardando un poco más de lo previsto, muchas gracias por su espera.';
                    claseMensaje = 'msg-naranja';
                } else if (tiempoExtra >= 5) {
                    nivelDemoraMax = Math.max(nivelDemoraMax, 1);
                    fillClass = 'fill-amarillo';
                    porcentajeBarra = 94;
                    infoDerecha = 'AFINANDO DETALLES';
                    mensajeCliente = 'Cuidando cada detalle de su plato para garantizar la mejor experiencia.';
                    claseMensaje = 'msg-amarillo';
                } else {
                    infoDerecha = tiempoExtra <= 0 ? `RESTAN ~${restanteMin} MIN` : `EMPLATANDO`;
                }
            } else {
                todosEntregados = false;
                const esperaMin = Math.max(0, (ahoraPlato - tiempoCreacion) / FACTOR_TIEMPO);
                porcentajeBarra = Math.min(24, Math.max(8, Math.round((esperaMin / etaMin) * 25) + 8));
                etapaTexto = 'INICIANDO PREPARACION';

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

    setInterval(actualizarEstadoPedidoCliente, 1000);

    window.addEventListener('storage', (e) => {
        if (e.key === 'gastroflow_pedidos' || !e.key) actualizarEstadoPedidoCliente();
    });

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = () => actualizarEstadoPedidoCliente();
    }

    renderizarCarta();
    actualizarEstadoPedidoCliente();
    window.addEventListener('storage', () => {
        renderizarCarta();
        actualizarEstadoPedidoCliente();
    });

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = () => {
            renderizarCarta();
            actualizarEstadoPedidoCliente();
        };
    }
});