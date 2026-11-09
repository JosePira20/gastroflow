document.addEventListener('DOMContentLoaded', () => {
    requerirRol('admin');

    const sesion = obtenerSesionPersonal();
    const labelAdmin = document.getElementById('admin-user-label');
    if (sesion && labelAdmin) {
        labelAdmin.textContent = sesion.nombre;
    }

    let mesaSeleccionadaAdmin = null;

    // =========================================================================
    // CONMUTACIÓN ENTRE LAS 2 INTERFACES DEL ADMINISTRADOR
    // =========================================================================
    window.cambiarVistaAdmin = (vista) => {
        const vOperacion = document.getElementById('vista-operacion');
        const vAnalitica = document.getElementById('vista-analitica');
        const btnOp = document.getElementById('btn-tab-operacion');
        const btnAn = document.getElementById('btn-tab-analitica');

        if (vista === 'operacion') {
            vOperacion.classList.remove('hidden');
            vAnalitica.classList.add('hidden');
            btnOp.classList.add('active');
            btnAn.classList.remove('active');
        } else {
            vOperacion.classList.add('hidden');
            vAnalitica.classList.remove('hidden');
            btnOp.classList.remove('active');
            btnAn.classList.add('active');
        }
        renderizarTodoAdmin();
    };

    // =========================================================================
    // 1. MONITOR DE ALERTAS EN VIVO (CON BOTÓN QUITAR ALERTA)
    // =========================================================================
    function renderizarMonitorAlertas() {
        const pedidos = obtenerPedidos();
        const contenedor = document.getElementById('contenedor-alertas-vivas');
        const contador = document.getElementById('contador-alertas-vivas');
        if (!contenedor || !contador) return;

        const alertasActivas = [];
        for (let m = 1; m <= 5; m++) {
            const ord = pedidos[m];
            if (ord && Array.isArray(ord.platos)) {
                ord.platos.forEach((p, idx) => {
                    if (p.alerta_sala === true || p.estado === 'Problema Notificado') {
                        alertasActivas.push({
                            mesaId: m,
                            indexPlato: idx,
                            plato: p.nombre,
                            motivo: p.motivo_alerta || 'Incidencia reportada en cocina',
                            chef: p.chef_nombre || 'Cocina',
                            hora: p.hora_alerta || 'En curso'
                        });
                    }
                });
            }
        }

        contador.textContent = `${alertasActivas.length} ACTIVA${alertasActivas.length === 1 ? '' : 'S'}`;
        contador.className = alertasActivas.length > 0 ? 'badge-count alert-pulse' : 'badge-count';

        if (alertasActivas.length === 0) {
            contenedor.innerHTML = `<div class="empty-state">Operación sin incidencias activas en este momento.</div>`;
            return;
        }

        contenedor.innerHTML = alertasActivas.map(a => `
            <div class="alert-live-card">
                <div class="alert-live-info">
                    <span class="alert-mesa-tag">MESA 0${a.mesaId}</span>
                    <strong>${a.plato}</strong>
                    <div class="alert-motivo-text">Motivo: ${a.motivo} · Reportó: ${a.chef}</div>
                </div>
                <button class="btn-quitar-alerta" onclick="quitarAlertaDesdeAdmin(${a.mesaId}, ${a.indexPlato})">
                    Quitar Alerta
                </button>
            </div>
        `).join('');
    }

    window.quitarAlertaDesdeAdmin = (mesaId, idxPlato) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[idxPlato]) return;

        const plato = pedidos[mesaId].platos[idxPlato];
        const ahora = Date.now();

        if (plato.inicio_pausa) {
            const tiempoPausado = Math.max(0, ahora - plato.inicio_pausa);
            if (plato.inicio_coccion) plato.inicio_coccion += tiempoPausado;
            if (plato.timestamp_creacion) plato.timestamp_creacion += tiempoPausado;
        }

        plato.alerta_sala = false;
        plato.inicio_pausa = null;
        plato.motivo_alerta = null;
        plato.estado = plato.inicio_coccion ? 'En Preparación' : 'En Cola';

        guardarTodosLosPedidos(pedidos);
        renderizarTodoAdmin();
    };

    // =========================================================================
    // 2. INTERVENCIÓN DE MESAS (1 A 5) Y GESTIÓN DE COMANDAS
    // =========================================================================
    function renderizarMapaMesasAdmin() {
        const pedidos = obtenerPedidos();
        const grid = document.getElementById('grid-mesas-admin');
        if (!grid) return;

        let html = '';
        for (let m = 1; m <= 5; m++) {
            const ord = pedidos[m];
            const activa = mesaSeleccionadaAdmin === m ? 'selected' : '';
            let estadoClase = 'mesa-libre';
            let estadoTexto = 'DISPONIBLE';
            let detallePlatos = 'Sin orden activa';

            if (ord && Array.isArray(ord.platos) && ord.platos.length > 0) {
                const total = ord.platos.length;
                const tieneAlerta = ord.platos.some(p => p.alerta_sala || p.estado === 'Problema Notificado');
                const tieneServido = ord.platos.some(p => p.estado === 'Servido');
                const todosEntregados = ord.platos.every(p => p.estado === 'Entregado');

                detallePlatos = `${total} plato${total === 1 ? '' : 's'} en comanda`;

                if (tieneAlerta) {
                    estadoClase = 'mesa-alerta';
                    estadoTexto = 'ALERTA EN COCINA';
                } else if (tieneServido) {
                    estadoClase = 'mesa-servido';
                    estadoTexto = 'LISTO PARA ENTREGAR';
                } else if (todosEntregados) {
                    estadoClase = 'mesa-comiendo';
                    estadoTexto = 'COMENSALES EN MESA';
                } else {
                    estadoClase = 'mesa-ocupada';
                    estadoTexto = 'EN PREPARACIÓN';
                }
            }

            html += `
                <div class="mesa-admin-card ${estadoClase} ${activa}" onclick="seleccionarMesaAdmin(${m})">
                    <div class="mesa-card-top">
                        <span class="mesa-number">MESA 0${m}</span>
                        <span class="mesa-status-pill">${estadoTexto}</span>
                    </div>
                    <div class="mesa-card-sub">${detallePlatos}</div>
                </div>
            `;
        }
        grid.innerHTML = html;
    }

    window.seleccionarMesaAdmin = (mesaId) => {
        mesaSeleccionadaAdmin = mesaId;
        renderizarMapaMesasAdmin();
        renderizarEditorComandaAdmin();
    };

    function poblarSelectorPlatosAdmin() {
        const select = document.getElementById('select-plato-admin');
        if (!select) return;
        const menu = obtenerMenuDB();
        const valorPrevio = select.value;

        select.innerHTML = menu.map((p, i) => {
            const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
            const inactivo = p.activo === false;
            return `<option value="${p.id}" ${inactivo ? 'disabled' : ''}>#${num} - ${p.nombre} ${inactivo ? '(INHABILITADO)' : ''}</option>`;
        }).join('');

        if (valorPrevio) select.value = valorPrevio;
    }

    function renderizarEditorComandaAdmin() {
        const editor = document.getElementById('editor-comanda-admin');
        const btnLiberar = document.getElementById('btn-liberar-mesa-admin');
        const titulo = document.getElementById('titulo-mesa-seleccionada');
        const subtitulo = document.getElementById('subtitulo-mesa-seleccionada');
        const listaPlatos = document.getElementById('lista-platos-mesa-admin');

        if (!mesaSeleccionadaAdmin) {
            editor.classList.add('hidden');
            btnLiberar.classList.add('hidden');
            return;
        }

        editor.classList.remove('hidden');
        poblarSelectorPlatosAdmin();

        const pedidos = obtenerPedidos();
        const ord = pedidos[mesaSeleccionadaAdmin];
        titulo.textContent = `GESTIÓN DE MESA 0${mesaSeleccionadaAdmin}`;

        if (!ord || !Array.isArray(ord.platos) || ord.platos.length === 0) {
            subtitulo.textContent = 'Mesa libre. Agrega un plato abajo para abrir comanda.';
            btnLiberar.classList.add('hidden');
            listaPlatos.innerHTML = `<div class="empty-state">No hay platos cargados en esta mesa.</div>`;
            return;
        }

        subtitulo.textContent = `Comanda activa con ${ord.platos.length} plato(s).`;
        btnLiberar.classList.remove('hidden');

        listaPlatos.innerHTML = ord.platos.map((item, idx) => {
            const enAlerta = item.alerta_sala || item.estado === 'Problema Notificado';
            return `
                <div class="comanda-admin-item ${enAlerta ? 'item-alerta' : ''}">
                    <div class="comanda-item-info">
                        <strong>${item.nombre}</strong>
                        <span class="item-state-tag">${item.estado || 'En Cola'}</span>
                        ${item.notas ? `<div class="item-note-text">Nota: ${item.notas}</div>` : ''}
                    </div>
                    <div class="comanda-item-actions">
                        ${item.estado !== 'Entregado' ? `
                            <button class="btn-success btn-xs" onclick="forzarEntregaPlatoAdmin(${mesaSeleccionadaAdmin}, ${idx})">
                                Marcar Entregado
                            </button>
                        ` : ''}
                        <button class="btn-secondary btn-xs" onclick="editarNotaPlatoAdmin(${mesaSeleccionadaAdmin}, ${idx})">
                            Nota
                        </button>
                        <button class="btn-danger btn-xs" onclick="eliminarPlatoMesaAdmin(${mesaSeleccionadaAdmin}, ${idx})">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.agregarPlatoAMesaAdmin = () => {
        if (!mesaSeleccionadaAdmin) return;
        const select = document.getElementById('select-plato-admin');
        const inputNota = document.getElementById('input-nota-admin');
        const platoId = parseInt(select.value);
        const menu = obtenerMenuDB();
        const platoInfo = menu.find(p => p.id === platoId);

        if (!platoInfo || platoInfo.activo === false) {
            alert('Este plato se encuentra inhabilitado.');
            return;
        }

        const pedidos = obtenerPedidos();
        const ahora = Date.now();
        if (!pedidos[mesaSeleccionadaAdmin]) {
            pedidos[mesaSeleccionadaAdmin] = { id: ahora, platos: [] };
        }

        const idxNuevo = pedidos[mesaSeleccionadaAdmin].platos.length;
        pedidos[mesaSeleccionadaAdmin].platos.push({
            uid_instancia: `${pedidos[mesaSeleccionadaAdmin].id}_${mesaSeleccionadaAdmin}_${idxNuevo}_${ahora}`,
            id_plato: platoInfo.id,
            nombre: platoInfo.nombre,
            notas: inputNota.value.trim(),
            estado: 'En Cola',
            timestamp_creacion: ahora,
            inicio_coccion: null,
            alerta_sala: false
        });

        inputNota.value = '';
        guardarTodosLosPedidos(pedidos);
        renderizarTodoAdmin();
    };

    window.forzarEntregaPlatoAdmin = (mesaId, idx) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[idx]) return;
        const plato = pedidos[mesaId].platos[idx];
        plato.estado = 'Entregado';
        plato.alerta_sala = false;
        plato.fin_coccion = plato.fin_coccion || Date.now();
        guardarTodosLosPedidos(pedidos);
        renderizarTodoAdmin();
    };

    window.editarNotaPlatoAdmin = (mesaId, idx) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[idx]) return;
        const actual = pedidos[mesaId].platos[idx].notas || '';
        const nueva = prompt('Editar especificación o nota del plato:', actual);
        if (nueva !== null) {
            pedidos[mesaId].platos[idx].notas = nueva.trim();
            guardarTodosLosPedidos(pedidos);
            renderizarTodoAdmin();
        }
    };

    window.eliminarPlatoMesaAdmin = (mesaId, idx) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[idx]) return;
        pedidos[mesaId].platos.splice(idx, 1);
        if (pedidos[mesaId].platos.length === 0) {
            pedidos[mesaId] = null;
        }
        guardarTodosLosPedidos(pedidos);
        renderizarTodoAdmin();
    };

    window.liberarMesaDesdeAdmin = () => {
        if (!mesaSeleccionadaAdmin) return;
        actualizarPedidoMesa(mesaSeleccionadaAdmin, null);
        renderizarTodoAdmin();
    };

    // =========================================================================
    // 3. PERSONAL EN TURNO (INDICADORES VERDES EN TIEMPO REAL)
    // =========================================================================
    function renderizarPersonalOnline() {
        const usuarios = obtenerUsuariosDB();
        const cont = document.getElementById('lista-personal-online');
        if (!cont) return;

        cont.innerHTML = usuarios.map(u => {
            const conectado = u.online === true;
            const nivelBadge = u.rol === 'cocinero' ? ` · Nivel ANOVA: ${u.nivel.toUpperCase()}` : '';
            return `
                <div class="staff-item">
                    <div class="staff-left">
                        <span class="status-dot ${conectado ? 'dot-online' : 'dot-offline'}"></span>
                        <div>
                            <div class="staff-name">${u.nombre}</div>
                            <div class="staff-meta">Rol: ${u.rol.toUpperCase()}${nivelBadge}</div>
                        </div>
                    </div>
                    <div class="staff-right">
                        <span class="staff-state-label ${conectado ? 'text-online' : 'text-offline'}">
                            ${conectado ? 'EN LÍNEA' : 'DESCONECTADO'}
                        </span>
                        <div class="staff-time-sub">
                            ${u.ultimaEntrada ? `Entrada: ${u.ultimaEntrada}` : 'Sin registro hoy'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // =========================================================================
    // 4. CRUD DE LA CARTA Y SWITCH DE HABILITAR / INHABILITAR PLATOS
    // =========================================================================
    function renderizarMenuAdmin() {
        const menu = obtenerMenuDB();
        const cont = document.getElementById('lista-menu-admin');
        if (!cont) return;

        cont.innerHTML = menu.map((p, idx) => {
            const num = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
            const activo = p.activo !== false;
            return `
                <div class="menu-admin-item ${activo ? '' : 'plato-inhabilitado'}">
                    <div class="menu-item-left">
                        <img src="${p.img}" alt="${p.nombre}" class="menu-thumb">
                        <div>
                            <div class="menu-item-title"><strong>#${num}</strong> ${p.nombre}</div>
                            <div class="menu-item-sub">Base: ${p.tiempoBase} min · Complejidad ANOVA: Nivel ${p.complejidad}</div>
                        </div>
                    </div>
                    <div class="menu-item-actions">
                        <button class="btn-switch ${activo ? 'switch-on' : 'switch-off'}" onclick="toggleDisponibilidadPlato(${p.id})">
                            ${activo ? 'Disponible' : 'Agotado / Inactivo'}
                        </button>
                        <button class="btn-secondary btn-xs" onclick="abrirModalPlato(${p.id})">Editar</button>
                        <button class="btn-danger btn-xs" onclick="eliminarPlatoCRUD(${p.id})">Borrar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleDisponibilidadPlato = (id) => {
        const menu = obtenerMenuDB();
        const idx = menu.findIndex(p => p.id === id);
        if (idx !== -1) {
            menu[idx].activo = menu[idx].activo === false ? true : false;
            guardarMenuDB(menu);
            renderizarTodoAdmin();
        }
    };

    window.abrirModalPlato = (id = null) => {
        const modal = document.getElementById('modal-plato');
        const titulo = document.getElementById('modal-plato-titulo');
        const idEdit = document.getElementById('plato-id-edit');

        if (id) {
            const p = obtenerMenuDB().find(x => x.id === id);
            if (!p) return;
            titulo.textContent = `Editar Plato: ${p.nombre}`;
            idEdit.value = p.id;
            document.getElementById('plato-nombre').value = p.nombre;
            document.getElementById('plato-tiempo').value = p.tiempoBase;
            document.getElementById('plato-complejidad').value = p.complejidad;
            document.getElementById('plato-alergenos').value = p.alergenos || '';
            document.getElementById('plato-img').value = p.img || '';
            document.getElementById('plato-desc').value = p.descripcion || '';
        } else {
            titulo.textContent = 'Agregar Nuevo Plato a la Carta';
            idEdit.value = '';
            document.getElementById('plato-nombre').value = '';
            document.getElementById('plato-tiempo').value = 15;
            document.getElementById('plato-complejidad').value = 2;
            document.getElementById('plato-alergenos').value = 'Libre de alérgenos comunes';
            document.getElementById('plato-img').value = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
            document.getElementById('plato-desc').value = '';
        }
        modal.classList.remove('hidden');
    };

    window.cerrarModalPlato = () => {
        document.getElementById('modal-plato').classList.add('hidden');
    };

    window.guardarPlatoCRUD = () => {
        const idEdit = document.getElementById('plato-id-edit').value;
        const nombre = document.getElementById('plato-nombre').value.trim();
        const tiempoBase = parseInt(document.getElementById('plato-tiempo').value) || 15;
        const complejidad = parseInt(document.getElementById('plato-complejidad').value) || 2;
        const alergenos = document.getElementById('plato-alergenos').value.trim();
        const img = document.getElementById('plato-img').value.trim();
        const descripcion = document.getElementById('plato-desc').value.trim();

        if (!nombre) {
            alert('Por favor ingresa el nombre del plato.');
            return;
        }

        const menu = obtenerMenuDB();
        if (idEdit) {
            const idx = menu.findIndex(p => p.id === parseInt(idEdit));
            if (idx !== -1) {
                menu[idx] = { ...menu[idx], nombre, tiempoBase, complejidad, alergenos, img, descripcion };
            }
        } else {
            const maxId = menu.reduce((max, p) => Math.max(max, p.id), 0);
            menu.push({
                id: maxId + 1,
                nombre,
                descripcion,
                alergenos,
                tiempoBase,
                complejidad,
                activo: true,
                img: img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop'
            });
        }

        guardarMenuDB(menu);
        cerrarModalPlato();
        renderizarTodoAdmin();
    };

    window.eliminarPlatoCRUD = (id) => {
        if (!confirm('¿Seguro que deseas eliminar este plato de la carta?')) return;
        const menu = obtenerMenuDB().filter(p => p.id !== id);
        guardarMenuDB(menu);
        renderizarTodoAdmin();
    };

    window.restaurarCartaOriginalConfirm = () => {
        if (!confirm('¿Restaurar los 12 platos originales de fábrica?')) return;
        restaurarMenuOriginalDB();
        renderizarTodoAdmin();
    };

    // =========================================================================
    // 5. INTERFAZ 2: ANALÍTICA, KPIs, RENDIMIENTO DE CHEFS E HISTORIAL CON RESEÑAS
    // =========================================================================
    function renderizarAnalitica() {
        const historial = obtenerHistorialDB();
        const resenas = (typeof obtenerResenasDB === 'function') ? obtenerResenasDB() : [];
        const usuarios = obtenerUsuariosDB();

        // 1. KPIs Superiores
        const totalPedidos = historial.length;
        document.getElementById('kpi-total-pedidos').textContent = totalPedidos;

        if (totalPedidos > 0) {
            const sumaReal = historial.reduce((acc, r) => acc + (Number(r.tiempoRealMin) || 0), 0);
            const sumaEta = historial.reduce((acc, r) => acc + (Number(r.etaMin) || 0), 0);
            const promReal = (sumaReal / totalPedidos).toFixed(1);
            const promEta = (sumaEta / totalPedidos).toFixed(1);

            const dentroEta = historial.filter(r => (Number(r.tiempoRealMin) || 0) <= (Number(r.etaMin) || 0) + 5).length;
            const pctEficiencia = Math.round((dentroEta / totalPedidos) * 100);

            document.getElementById('kpi-tiempo-promedio').textContent = `${promReal} min`;
            document.getElementById('kpi-comparativa-eta').textContent = `ETA esperado prom: ${promEta} min`;
            document.getElementById('kpi-eficiencia').textContent = `${pctEficiencia}%`;
        } else {
            document.getElementById('kpi-tiempo-promedio').textContent = '0 min';
            document.getElementById('kpi-comparativa-eta').textContent = 'Sin datos registrados';
            document.getElementById('kpi-eficiencia').textContent = '100%';
        }

        // Calificación promedio de clientes
        const calificacionesValidas = historial.filter(h => h.estrellas).map(h => Number(h.estrellas));
        const listaEstrellas = calificacionesValidas.length > 0
            ? calificacionesValidas
            : resenas.map(r => Number(r.estrellas) || 5);

        if (listaEstrellas.length > 0) {
            const promEstrellas = (listaEstrellas.reduce((a, b) => a + b, 0) / listaEstrellas.length).toFixed(1);
            document.getElementById('kpi-calificacion-media').textContent = `★ ${promEstrellas}`;
            document.getElementById('kpi-total-resenas').textContent = `Basado en ${listaEstrellas.length} calificación(es)`;
        } else {
            document.getElementById('kpi-calificacion-media').textContent = '★ -';
            document.getElementById('kpi-total-resenas').textContent = 'Sin reseñas aún';
        }

        // 2. Tabla de Rendimiento por Chef
        const chefs = usuarios.filter(u => u.rol === 'cocinero');
        const tbodyChefs = document.getElementById('tabla-rendimiento-chefs');
        if (tbodyChefs) {
            tbodyChefs.innerHTML = chefs.map(c => {
                const platosChef = historial.filter(h => h.chef === c.nombre);
                const cant = platosChef.length;
                if (cant === 0) {
                    return `
                        <tr>
                            <td><strong>${c.nombre}</strong></td>
                            <td><span class="nivel-pill">${(c.nivel || 'experto').toUpperCase()}</span></td>
                            <td>0</td>
                            <td>-</td>
                            <td>-</td>
                            <td>0</td>
                            <td>100%</td>
                        </tr>
                    `;
                }
                const etaProm = (platosChef.reduce((a, b) => a + (Number(b.etaMin) || 0), 0) / cant).toFixed(1);
                const realProm = (platosChef.reduce((a, b) => a + (Number(b.tiempoRealMin) || 0), 0) / cant).toFixed(1);
                const alertas = platosChef.filter(p => p.tuvoAlerta).length;
                const cumplidos = platosChef.filter(p => (Number(p.tiempoRealMin) || 0) <= (Number(p.etaMin) || 0) + 5).length;
                const efic = Math.round((cumplidos / cant) * 100);

                return `
                    <tr>
                        <td><strong>${c.nombre}</strong></td>
                        <td><span class="nivel-pill">${(c.nivel || 'experto').toUpperCase()}</span></td>
                        <td>${cant}</td>
                        <td>${etaProm} min</td>
                        <td><strong>${realProm} min</strong></td>
                        <td>${alertas}</td>
                        <td><span class="efic-badge ${efic >= 80 ? 'efic-alta' : 'efic-baja'}">${efic}%</span></td>
                    </tr>
                `;
            }).join('');
        }

        // 3. Tabla de Historial Documentado con Calificación (★) y Correo Cliente
        const tbodyHist = document.getElementById('tabla-historial-body');
        if (tbodyHist) {
            if (historial.length === 0) {
                tbodyHist.innerHTML = `
                    <tr>
                        <td colspan="11" class="empty-table-cell">No hay pedidos registrados en el historial todavía.</td>
                    </tr>
                `;
            } else {
                tbodyHist.innerHTML = historial.map(reg => {
                    const resenaAsociada = resenas.find(r =>
                        (reg.uid_instancia && r.uid_plato === reg.uid_instancia) ||
                        (r.mesa === reg.mesa && r.plato === reg.plato)
                    );

                    const numEstrellas = reg.estrellas || (resenaAsociada ? resenaAsociada.estrellas : null);
                    const estrellasHTML = numEstrellas
                        ? `<span class="stars-gold">${'★'.repeat(numEstrellas)}${'☆'.repeat(5 - numEstrellas)}</span>`
                        : '';

                    const correoCliente = (reg.emailCliente !== undefined && reg.emailCliente !== '')
                        ? reg.emailCliente
                        : (resenaAsociada && resenaAsociada.email ? resenaAsociada.email : '');

                    return `
                        <tr>
                            <td>${reg.fechaHora || '-'}</td>
                            <td><strong>${reg.mesa || '-'}</strong></td>
                            <td>${reg.plato || '-'}</td>
                            <td>Nivel ${reg.complejidad || 2}</td>
                            <td>${reg.chef || '-'} <span class="text-muted">(${reg.nivelChef || 'experto'})</span></td>
                            <td>${reg.etaMin || 0} min</td>
                            <td><strong>${reg.tiempoRealMin || 0} min</strong></td>
                            <td>${reg.tuvoAlerta ? '<span class="alerta-si">Sí</span>' : 'No'}</td>
                            <td>${reg.estadoFinal || 'Servido'}</td>
                            <td>${estrellasHTML}</td>
                            <td>${correoCliente}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // 4. Bitácora de Sesiones
        const logs = obtenerLogSesiones();
        const tbodySesiones = document.getElementById('tabla-sesiones-body');
        if (tbodySesiones) {
            if (logs.length === 0) {
                tbodySesiones.innerHTML = `<tr><td colspan="4" class="empty-table-cell">Sin eventos de sesión registrados.</td></tr>`;
            } else {
                tbodySesiones.innerHTML = logs.slice(0, 30).map(l => `
                    <tr>
                        <td>${l.fechaHora}</td>
                        <td><strong>${l.nombre}</strong></td>
                        <td>${l.rol.toUpperCase()}</td>
                        <td>${l.accion}</td>
                    </tr>
                `).join('');
            }
        }
    }

    // =========================================================================
    // 6. CRUD DE USUARIOS Y CAMBIO EN CALIENTE DE NIVEL ANOVA DEL CHEF
    // =========================================================================
    function renderizarUsuariosCRUD() {
        const usuarios = obtenerUsuariosDB();
        const cont = document.getElementById('lista-usuarios-crud');
        if (!cont) return;

        cont.innerHTML = usuarios.map(u => `
            <div class="user-crud-item">
                <div>
                    <div class="user-crud-name"><strong>${u.nombre}</strong> <span class="text-muted">(@${u.usuario})</span></div>
                    <div class="user-crud-sub">Rol: ${u.rol.toUpperCase()}</div>
                </div>
                <div class="user-crud-actions">
                    ${u.rol === 'cocinero' ? `
                        <select class="admin-input select-xs" onchange="cambiarNivelChefRapido(${u.id}, this.value)">
                            <option value="principiante" ${u.nivel === 'principiante' ? 'selected' : ''}>Principiante / Novato</option>
                            <option value="intermedio" ${u.nivel === 'intermedio' ? 'selected' : ''}>Intermedio</option>
                            <option value="experto" ${u.nivel === 'experto' ? 'selected' : ''}>Experto</option>
                        </select>
                    ` : ''}
                    <button class="btn-secondary btn-xs" onclick="abrirModalUsuario(${u.id})">Editar</button>
                    ${u.usuario !== 'admin' ? `<button class="btn-danger btn-xs" onclick="eliminarUsuarioCRUD(${u.id})">Borrar</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    window.cambiarNivelChefRapido = (id, nuevoNivel) => {
        const usuarios = obtenerUsuariosDB();
        const idx = usuarios.findIndex(u => u.id === id);
        if (idx !== -1) {
            usuarios[idx].nivel = nuevoNivel;
            guardarUsuariosDB(usuarios);
            renderizarTodoAdmin();
        }
    };

    window.actualizarVisibilidadNivelChef = () => {
        const rol = document.getElementById('user-rol').value;
        const grupo = document.getElementById('grupo-nivel-chef');
        if (rol === 'cocinero') {
            grupo.classList.remove('hidden');
        } else {
            grupo.classList.add('hidden');
        }
    };

    window.abrirModalUsuario = (id = null) => {
        const modal = document.getElementById('modal-usuario');
        const idEdit = document.getElementById('usuario-id-edit');
        const titulo = document.getElementById('modal-usuario-titulo');

        if (id) {
            const u = obtenerUsuariosDB().find(x => x.id === id);
            if (!u) return;
            titulo.textContent = `Editar Empleado: ${u.nombre}`;
            idEdit.value = u.id;
            document.getElementById('user-nombre').value = u.nombre;
            document.getElementById('user-login').value = u.usuario;
            document.getElementById('user-clave').value = u.clave;
            document.getElementById('user-rol').value = u.rol;
            document.getElementById('user-nivel').value = u.nivel !== 'n/a' ? u.nivel : 'intermedio';
        } else {
            titulo.textContent = 'Nuevo Empleado';
            idEdit.value = '';
            document.getElementById('user-nombre').value = '';
            document.getElementById('user-login').value = '';
            document.getElementById('user-clave').value = '1234';
            document.getElementById('user-rol').value = 'cocinero';
            document.getElementById('user-nivel').value = 'intermedio';
        }
        actualizarVisibilidadNivelChef();
        modal.classList.remove('hidden');
    };

    window.cerrarModalUsuario = () => {
        document.getElementById('modal-usuario').classList.add('hidden');
    };

    window.guardarUsuarioCRUD = () => {
        const idEdit = document.getElementById('usuario-id-edit').value;
        const nombre = document.getElementById('user-nombre').value.trim();
        const usuario = document.getElementById('user-login').value.trim();
        const clave = document.getElementById('user-clave').value.trim();
        const rol = document.getElementById('user-rol').value;
        const nivel = rol === 'cocinero' ? document.getElementById('user-nivel').value : 'n/a';

        if (!nombre || !usuario || !clave) {
            alert('Completa nombre, usuario y contraseña.');
            return;
        }

        const lista = obtenerUsuariosDB();
        if (idEdit) {
            const idx = lista.findIndex(u => u.id === parseInt(idEdit));
            if (idx !== -1) {
                lista[idx] = { ...lista[idx], nombre, usuario, clave, rol, nivel };
            }
        } else {
            const maxId = lista.reduce((max, u) => Math.max(max, u.id), 0);
            lista.push({
                id: maxId + 1,
                usuario,
                clave,
                rol,
                nombre,
                nivel,
                rendimiento: 1.0,
                online: false,
                ultimaEntrada: null,
                ultimaSalida: null
            });
        }

        guardarUsuariosDB(lista);
        cerrarModalUsuario();
        renderizarTodoAdmin();
    };

    window.eliminarUsuarioCRUD = (id) => {
        if (!confirm('¿Eliminar este empleado del sistema?')) return;
        const lista = obtenerUsuariosDB().filter(u => u.id !== id);
        guardarUsuariosDB(lista);
        renderizarTodoAdmin();
    };

    // =========================================================================
    // 7. SIMULACIÓN ANOVA Y EXPORTACIÓN EXCEL (.CSV) CON CALIFICACIÓN Y CORREO
    // =========================================================================
    window.simularMuestraANOVA = () => {
        const menu = obtenerMenuDB();
        const chefs = obtenerUsuariosDB().filter(u => u.rol === 'cocinero');
        if (chefs.length === 0 || menu.length === 0) return;

        for (let i = 0; i < 6; i++) {
            const plato = menu[Math.floor(Math.random() * menu.length)];
            const chef = chefs[Math.floor(Math.random() * chefs.length)];
            const eta = calcularETAChef(plato.id, chef.nivel, 1.0);
            const variacion = Math.floor(Math.random() * 7) - 2;
            const real = Math.max(4, eta + variacion);

            registrarPlatoEnHistorial({
                uid_instancia: `sim_${Date.now()}_${i}`,
                mesa: `Mesa 0${(i % 5) + 1}`,
                plato: plato.nombre,
                complejidad: plato.complejidad,
                chef: chef.nombre,
                nivelChef: chef.nivel,
                etaMin: eta,
                tiempoRealMin: real,
                tuvoAlerta: real - eta > 5,
                estadoFinal: 'Servido',
                estrellas: null,
                emailCliente: ''
            });
        }
        renderizarTodoAdmin();
    };

    window.limpiarHistorialConfirm = () => {
        if (!confirm('¿Seguro que deseas borrar todo el historial estadístico de pedidos?')) return;
        limpiarHistorialDB();
        renderizarTodoAdmin();
    };

    window.exportarHistorialCSV = () => {
        const historial = obtenerHistorialDB();
        const resenas = (typeof obtenerResenasDB === 'function') ? obtenerResenasDB() : [];

        if (!historial || historial.length === 0) {
            alert('No hay datos en el historial para exportar.');
            return;
        }

        const cabeceras = [
            'Fecha_Hora',
            'Mesa',
            'Plato',
            'Complejidad_ANOVA',
            'Chef',
            'Nivel_Chef',
            'ETA_Estimado_Min',
            'Tiempo_Real_Min',
            'Tuvo_Alerta',
            'Estado_Final',
            'Calificacion_Estrellas',
            'Correo_Cliente'
        ];

        const filas = historial.map(reg => {
            const resenaAsociada = resenas.find(r =>
                (reg.uid_instancia && r.uid_plato === reg.uid_instancia) ||
                (r.mesa === reg.mesa && r.plato === reg.plato)
            );
            const estrellas = reg.estrellas || (resenaAsociada ? resenaAsociada.estrellas : '');
            const correo = (reg.emailCliente !== undefined && reg.emailCliente !== '')
                ? reg.emailCliente
                : (resenaAsociada && resenaAsociada.email ? resenaAsociada.email : '');

            return [
                `"${reg.fechaHora || ''}"`,
                `"${reg.mesa || ''}"`,
                `"${(reg.plato || '').replace(/"/g, '""')}"`,
                reg.complejidad || 2,
                `"${reg.chef || ''}"`,
                `"${reg.nivelChef || ''}"`,
                reg.etaMin || 0,
                reg.tiempoRealMin || 0,
                reg.tuvoAlerta ? 'SI' : 'NO',
                `"${reg.estadoFinal || 'Servido'}"`,
                estrellas,
                `"${correo}"`
            ].join(',');
        });

        const contenidoCSV = '\uFEFF' + [cabeceras.join(','), ...filas].join('\n');
        const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'reporte_tiempos_gastroflow.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function renderizarTodoAdmin() {
        renderizarMonitorAlertas();
        renderizarMapaMesasAdmin();
        renderizarEditorComandaAdmin();
        renderizarPersonalOnline();
        renderizarMenuAdmin();
        renderizarAnalitica();
        renderizarUsuariosCRUD();
    }

    window.addEventListener('storage', renderizarTodoAdmin);
    window.addEventListener('gastroflow:update', renderizarTodoAdmin);

    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = renderizarTodoAdmin;
    }

    renderizarTodoAdmin();
});