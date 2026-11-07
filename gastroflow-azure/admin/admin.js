document.addEventListener('DOMContentLoaded', () => {
    requerirRol('admin');

    const sesion = obtenerSesionPersonal();
    if (sesion) {
        document.getElementById('admin-user-display').textContent = sesion.nombre;
    }

    let mesaAdminSeleccionada = null;

    // =========================================================================
    // CONMUTADOR ENTRE INTERFAZ 1 (TIEMPO REAL) E INTERFAZ 2 (ANALÍTICA)
    // =========================================================================
    window.cambiarInterfazAdmin = (vista) => {
        const vLive = document.getElementById('vista-live');
        const vAnalytics = document.getElementById('vista-analytics');
        const btnLive = document.getElementById('btn-vista-live');
        const btnAnalytics = document.getElementById('btn-vista-analytics');

        if (vista === 'live') {
            vLive.classList.remove('hidden');
            vAnalytics.classList.add('hidden');
            btnLive.classList.add('active');
            btnAnalytics.classList.remove('active');
        } else {
            vLive.classList.add('hidden');
            vAnalytics.classList.remove('hidden');
            btnLive.classList.remove('active');
            btnAnalytics.classList.add('active');
        }
        sincronizarTodoAdmin();
    };

    // =========================================================================
    // INTERFAZ 1: MESAS EN VIVO, MODIFICACIÓN DE ÓRDENES Y MONITOR DE ALERTAS
    // =========================================================================
    function renderizarMesasYAlertasLive() {
        const pedidos = obtenerPedidos();
        const gridMesas = document.getElementById('admin-grid-mesas');
        const contAlertas = document.getElementById('contenedor-alertas-live');
        const badgeAlertas = document.getElementById('badge-total-alertas');

        let htmlMesas = '';
        let htmlAlertas = '';
        let totalAlertas = 0;

        for (let i = 1; i <= 5; i++) {
            const pMesa = pedidos[i];
            const platos = (pMesa && Array.isArray(pMesa.platos)) ? pMesa.platos : [];
            const ocupada = platos.length > 0;

            let tieneAlerta = false;
            let todosEntregados = ocupada && platos.every(p => p.estado === 'Entregado');

            platos.forEach((p, idx) => {
                if (p.alerta_sala === true || p.estado === 'Problema Notificado') {
                    tieneAlerta = true;
                    totalAlertas++;
                    htmlAlertas += `
                        <div class="alerta-live-card">
                            <div class="alerta-info">
                                <h4>MESA 0${i} · ${p.nombre}</h4>
                                <p><strong>Motivo:</strong> ${p.motivo_alerta || 'Demora crítica reportada'}</p>
                                <div class="alerta-meta">
                                    Reportado por: <strong>${p.alerta_autor || p.chef_nombre || 'Cocina'}</strong> 
                                    ${p.alerta_hora ? `a las ${p.alerta_hora}` : ''}
                                </div>
                            </div>
                            <button class="btn-primary" onclick="adminQuitarAlertaDirecta(${i}, ${idx})">
                                Quitar Alerta
                            </button>
                        </div>
                    `;
                }
            });

            let claseEstado = '';
            let textoEstado = 'LIBRE';
            if (ocupada) {
                if (tieneAlerta) { claseEstado = 'alerta'; textoEstado = 'ALERTA ROJA'; }
                else if (todosEntregados) { claseEstado = 'comiendo'; textoEstado = 'COMIENDO'; }
                else { claseEstado = 'ocupada'; textoEstado = 'ACTIVA'; }
            }

            htmlMesas += `
                <div class="mesa-admin-card ${claseEstado}" onclick="abrirModalOrdenAdmin(${i})">
                    <div class="mesa-admin-top">
                        <span>MESA 0${i}</span>
                        <span style="font-size:0.75em;">${textoEstado}</span>
                    </div>
                    <div class="mesa-admin-sub">
                        ${ocupada ? `${platos.length} plato(s) en orden` : 'Click para abrir orden'}
                    </div>
                </div>
            `;
        }

        gridMesas.innerHTML = htmlMesas;
        badgeAlertas.textContent = `${totalAlertas} ALERTA(S)`;
        contAlertas.innerHTML = htmlAlertas || '<p class="panel-subtitle">No hay alertas activas en este momento. Operación normal.</p>';
    }

    // Quitar alerta directamente desde el Admin (igual que el cocinero, despausando el tiempo)
    window.adminQuitarAlertaDirecta = (mesaId, indexPlato) => {
        const pedidos = obtenerPedidos();
        if (!pedidos[mesaId] || !pedidos[mesaId].platos[indexPlato]) return;

        const plato = pedidos[mesaId].platos[indexPlato];
        if (!confirm(`¿Quitar la alerta del plato "${plato.nombre}" (Mesa 0${mesaId}) y reanudar su temporizador?`)) return;

        const ahora = Date.now();
        if (plato.inicio_pausa) {
            const duracionPausaMs = ahora - plato.inicio_pausa;
            if (plato.inicio_coccion) plato.inicio_coccion += duracionPausaMs;
            if (plato.timestamp_creacion) plato.timestamp_creacion += duracionPausaMs;
            if (plato.limite_extra_ms) plato.limite_extra_ms += duracionPausaMs;
        }

        plato.alerta_sala = false;
        plato.inicio_pausa = null;
        plato.motivo_alerta = null;
        if (plato.estado === 'Problema Notificado') {
            plato.estado = plato.inicio_coccion ? 'Cocinando' : 'En preparación';
        }

        guardarTodosLosPedidos(pedidos);
        sincronizarTodoAdmin();
        if (mesaAdminSeleccionada === mesaId) renderizarPlatosModalMesa();
    };

    // Modal para que el Admin edite, agregue o cancele pedidos de una mesa
    window.abrirModalOrdenAdmin = (mesaId) => {
        mesaAdminSeleccionada = mesaId;
        document.getElementById('modal-orden-titulo').textContent = `GESTIONAR ORDEN - MESA 0${mesaId}`;

        const select = document.getElementById('admin-select-plato');
        const menu = obtenerMenuDB();
        select.innerHTML = menu.map((p, idx) => {
            const num = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
            return `<option value="${p.id}" ${p.activo === false ? 'disabled' : ''}>#${num} - ${p.nombre} ${p.activo === false ? '(INHABILITADO)' : ''}</option>`;
        }).join('');

        renderizarPlatosModalMesa();
        document.getElementById('modal-orden-admin').classList.remove('hidden');
    };

    window.cerrarModalOrdenAdmin = () => {
        mesaAdminSeleccionada = null;
        document.getElementById('modal-orden-admin').classList.add('hidden');
    };

    function renderizarPlatosModalMesa() {
        if (!mesaAdminSeleccionada) return;
        const pedidos = obtenerPedidos();
        const contenedor = document.getElementById('admin-lista-platos-mesa');
        const platos = (pedidos[mesaAdminSeleccionada] && pedidos[mesaAdminSeleccionada].platos) ? pedidos[mesaAdminSeleccionada].platos : [];

        if (platos.length === 0) {
            contenedor.innerHTML = '<p class="panel-subtitle">Esta mesa no tiene pedidos activos.</p>';
            return;
        }

        contenedor.innerHTML = platos.map((item, idx) => {
            const tieneAlerta = item.alerta_sala === true || item.estado === 'Problema Notificado';
            return `
                <div class="admin-plato-row">
                    <div>
                        <strong>${item.nombre}</strong> <span class="badge-comp comp-2">${tieneAlerta ? 'ALERTA ACTIVA' : item.estado}</span>
                        <div style="font-size:0.76em; color:#a1a1aa; margin-top:3px;">
                            Nota: ${item.notas || 'Sin notas'}
                        </div>
                    </div>
                    <div class="btn-group">
                        ${tieneAlerta ? `<button class="btn-primary" onclick="adminQuitarAlertaDirecta(${mesaAdminSeleccionada}, ${idx})">Quitar Alerta</button>` : ''}
                        <button class="btn-action-edit" onclick="adminEditarNotaPlato(${idx})">Editar Nota</button>
                        ${item.estado !== 'Entregado' ? `<button class="btn-toggle-on" onclick="adminForzarEstadoPlato(${idx}, 'Entregado')">Marcar Entregado</button>` : ''}
                        <button class="btn-action-del" onclick="adminEliminarPlatoMesa(${idx})">Cancelar Plato</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.adminAgregarPlatoMesa = () => {
        if (!mesaAdminSeleccionada) return;
        const platoId = parseInt(document.getElementById('admin-select-plato').value);
        const notas = document.getElementById('admin-input-notas').value.trim();
        const platoObj = obtenerMenuDB().find(p => p.id === platoId);
        if (!platoObj) return;

        const pedidos = obtenerPedidos();
        if (!pedidos[mesaAdminSeleccionada]) {
            pedidos[mesaAdminSeleccionada] = { id: Date.now(), platos: [] };
        }

        pedidos[mesaAdminSeleccionada].platos.push({
            id_plato: platoObj.id,
            nombre: platoObj.nombre,
            notas,
            estado: 'En preparación',
            timestamp_creacion: Date.now()
        });

        document.getElementById('admin-input-notas').value = '';
        guardarTodosLosPedidos(pedidos);
        renderizarPlatosModalMesa();
        sincronizarTodoAdmin();
    };

    window.adminEditarNotaPlato = (idx) => {
        const pedidos = obtenerPedidos();
        const item = pedidos[mesaAdminSeleccionada]?.platos[idx];
        if (!item) return;

        const nuevaNota = prompt(`Editar nota para ${item.nombre}:`, item.notas || '');
        if (nuevaNota !== null) {
            item.notas = nuevaNota.trim();
            guardarTodosLosPedidos(pedidos);
            renderizarPlatosModalMesa();
        }
    };

    window.adminForzarEstadoPlato = (idx, nuevoEstado) => {
        const pedidos = obtenerPedidos();
        const item = pedidos[mesaAdminSeleccionada]?.platos[idx];
        if (!item) return;

        item.estado = nuevoEstado;
        item.alerta_sala = false;
        item.inicio_pausa = null;
        guardarTodosLosPedidos(pedidos);
        renderizarPlatosModalMesa();
        sincronizarTodoAdmin();
    };

    window.adminEliminarPlatoMesa = (idx) => {
        const pedidos = obtenerPedidos();
        const item = pedidos[mesaAdminSeleccionada]?.platos[idx];
        if (!item) return;

        if (confirm(`¿Cancelar y eliminar "${item.nombre}" de la Mesa 0${mesaAdminSeleccionada}?`)) {
            pedidos[mesaAdminSeleccionada].platos.splice(idx, 1);
            if (pedidos[mesaAdminSeleccionada].platos.length === 0) {
                pedidos[mesaAdminSeleccionada] = null;
            }
            guardarTodosLosPedidos(pedidos);
            renderizarPlatosModalMesa();
            sincronizarTodoAdmin();
        }
    };

    window.adminLiberarMesaCompleta = () => {
        if (!mesaAdminSeleccionada) return;
        if (confirm(`¿Estás seguro de vaciar y liberar por completo la Mesa 0${mesaAdminSeleccionada}?`)) {
            actualizarPedidoMesa(mesaAdminSeleccionada, null);
            cerrarModalOrdenAdmin();
            sincronizarTodoAdmin();
        }
    };

    // =========================================================================
    // PERSONAL EN LÍNEA (LISTA CON INDICADOR VERDE)
    // =========================================================================
    function renderizarPersonalOnline() {
        const usuarios = obtenerUsuariosDB();
        const contenedor = document.getElementById('lista-personal-online');

        contenedor.innerHTML = usuarios.map(u => {
            const estaOnline = u.online === true;
            return `
                <div class="online-item">
                    <div>
                        <span class="status-dot ${estaOnline ? 'dot-green' : 'dot-gray'}"></span>
                        <strong>${u.nombre}</strong>
                        <span style="color:#71717a; font-size:0.85em;">(${u.rol.toUpperCase()})</span>
                    </div>
                    <div style="font-size:0.78em; color:${estaOnline ? '#4ade80' : '#71717a'}; font-weight:600;">
                        ${estaOnline ? `EN LINEA (${u.ultimaEntrada || 'Activo'})` : 'Desconectado'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // =========================================================================
    // GESTIÓN DE PRODUCTOS / CARTA (HABILITAR, INHABILITAR, CREAR, EDITAR, BORRAR)
    // =========================================================================
    function renderizarTablaMenu() {
        const menu = obtenerMenuDB();
        const tbody = document.getElementById('tabla-menu-body');
        const textoComp = { 1: '1 - Baja', 2: '2 - Media', 3: '3 - Alta' };

        tbody.innerHTML = menu.map((plato, index) => {
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            const disponible = plato.activo !== false;

            return `
                <tr style="opacity: ${disponible ? '1' : '0.55'};">
                    <td><strong>#${num}</strong></td>
                    <td><img src="${plato.img}" alt="${plato.nombre}" class="thumb-plato"></td>
                    <td>
                        <div><strong>${plato.nombre}</strong></div>
                        <div style="font-size:0.75em; color:#71717a;">${plato.alergenos}</div>
                    </td>
                    <td>${plato.tiempoBase} min</td>
                    <td><span class="badge-comp comp-${plato.complejidad}">${textoComp[plato.complejidad] || '2 - Media'}</span></td>
                    <td>
                        <button class="${disponible ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="alternarDisponibilidadPlato(${plato.id})">
                            ${disponible ? 'HABILITADO' : 'INHABILITADO'}
                        </button>
                    </td>
                    <td>
                        <button class="btn-action-edit" onclick="editarPlato(${plato.id})">Editar</button>
                        <button class="btn-action-del" onclick="eliminarPlato(${plato.id})">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.alternarDisponibilidadPlato = (id) => {
        const menu = obtenerMenuDB();
        const index = menu.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            menu[index].activo = menu[index].activo === false ? true : false;
            guardarMenuDB(menu);
            renderizarTablaMenu();
        }
    };

    window.abrirModalPlato = () => {
        document.getElementById('form-plato').reset();
        document.getElementById('plato-id').value = '';
        document.getElementById('modal-plato-titulo').textContent = 'AGREGAR NUEVO PLATO';
        document.getElementById('modal-plato').classList.remove('hidden');
    };

    window.editarPlato = (id) => {
        const plato = obtenerMenuDB().find(p => p.id === parseInt(id));
        if (!plato) return;

        document.getElementById('plato-id').value = plato.id;
        document.getElementById('plato-nombre').value = plato.nombre;
        document.getElementById('plato-tiempo').value = plato.tiempoBase;
        document.getElementById('plato-complejidad').value = plato.complejidad;
        document.getElementById('plato-alergenos').value = plato.alergenos;
        document.getElementById('plato-descripcion').value = plato.descripcion;
        document.getElementById('plato-img').value = plato.img;

        document.getElementById('modal-plato-titulo').textContent = `EDITAR: ${plato.nombre}`;
        document.getElementById('modal-plato').classList.remove('hidden');
    };

    window.cerrarModalPlato = () => {
        document.getElementById('modal-plato').classList.add('hidden');
    };

    window.guardarPlatoFormulario = (e) => {
        e.preventDefault();
        const menu = obtenerMenuDB();
        const idInput = document.getElementById('plato-id').value;

        const datos = {
            nombre: document.getElementById('plato-nombre').value.trim(),
            tiempoBase: parseInt(document.getElementById('plato-tiempo').value),
            complejidad: parseInt(document.getElementById('plato-complejidad').value),
            alergenos: document.getElementById('plato-alergenos').value.trim(),
            descripcion: document.getElementById('plato-descripcion').value.trim(),
            img: document.getElementById('plato-img').value.trim()
        };

        if (idInput) {
            const idx = menu.findIndex(p => p.id === parseInt(idInput));
            if (idx !== -1) menu[idx] = { ...menu[idx], ...datos };
        } else {
            const maxId = menu.reduce((max, p) => (p.id > max ? p.id : max), 0);
            menu.push({ id: maxId + 1, activo: true, ...datos });
        }

        guardarMenuDB(menu);
        cerrarModalPlato();
        renderizarTablaMenu();
    };

    window.eliminarPlato = (id) => {
        const menu = obtenerMenuDB();
        const plato = menu.find(p => p.id === parseInt(id));
        if (!plato) return;

        if (confirm(`¿Eliminar definitivamente el plato "${plato.nombre}" del menú?`)) {
            guardarMenuDB(menu.filter(p => p.id !== parseInt(id)));
            renderizarTablaMenu();
        }
    };

    window.restaurarDatosFabrica = () => {
        if (confirm('¿Restaurar los 12 platos originales de fábrica?')) {
            restaurarMenuOriginalDB();
            renderizarTablaMenu();
        }
    };

    // =========================================================================
    // INTERFAZ 2: GESTIÓN DE EMPLEADOS, ESTATUS DE CHEFS Y ANALÍTICAS
    // =========================================================================
    function renderizarEmpleadosYAnaliticas() {
        const usuarios = obtenerUsuariosDB();
        const historial = obtenerHistorialDB();
        const logsSesiones = obtenerLogSesiones();

        // 1. Tabla de Empleados con cambio directo de estatus para los Chefs
        const tbodyEmp = document.getElementById('tabla-empleados-body');
        tbodyEmp.innerHTML = usuarios.map(u => {
            const esChef = u.rol === 'cocinero';
            const selectorNivel = esChef ? `
                <select class="select-estatus-inline" onchange="cambiarEstatusChefDirecto(${u.id}, this.value)">
                    <option value="principiante" ${u.nivel === 'principiante' ? 'selected' : ''}>Principiante / Novato</option>
                    <option value="intermedio" ${u.nivel === 'intermedio' ? 'selected' : ''}>Intermedio</option>
                    <option value="experto" ${u.nivel === 'experto' ? 'selected' : ''}>Experto</option>
                </select>
            ` : `<span style="color:#71717a;">No aplica</span>`;

            return `
                <tr>
                    <td>
                        <span class="status-dot ${u.online ? 'dot-green' : 'dot-gray'}"></span>
                        ${u.online ? 'Conectado' : 'Inactivo'}
                    </td>
                    <td>
                        <strong>${u.nombre}</strong>
                        <div style="font-size:0.75em; color:#71717a;">Usuario: ${u.usuario}</div>
                    </td>
                    <td>${u.rol.toUpperCase()}</td>
                    <td>${selectorNivel}</td>
                    <td style="font-size:0.78em; color:#a1a1aa;">
                        Entrada: ${u.ultimaEntrada || '--:--'}<br>
                        Salida: ${u.ultimaSalida || '--:--'}
                    </td>
                    <td>
                        <button class="btn-action-edit" onclick="editarEmpleado(${u.id})">Editar</button>
                        ${u.usuario !== 'admin' ? `<button class="btn-action-del" onclick="eliminarEmpleado(${u.id})">Borrar</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        // 2. KPIs Generales del Historial
        const servidos = historial.filter(h => h.estadoFinal === 'Servido');
        const incidencias = historial.filter(h => h.tuvoAlerta || h.estadoFinal !== 'Servido').length;
        const promReal = servidos.length > 0
            ? Math.round(servidos.reduce((acc, h) => acc + h.tiempoRealMin, 0) / servidos.length)
            : 0;
        const aTiempo = servidos.filter(h => h.tiempoRealMin <= h.etaMin + 2).length;
        const pctEficiencia = servidos.length > 0 ? Math.round((aTiempo / servidos.length) * 100) : 100;

        document.getElementById('kpi-hist-total').textContent = historial.length;
        document.getElementById('kpi-hist-promedio').textContent = `${promReal} min`;
        document.getElementById('kpi-hist-eficiencia').textContent = `${pctEficiencia}%`;
        document.getElementById('kpi-hist-incidencias').textContent = incidencias;

        // 3. Tabla de Rendimiento por Chef
        const chefs = usuarios.filter(u => u.rol === 'cocinero');
        const tbodyRendimiento = document.getElementById('tabla-rendimiento-chefs');
        tbodyRendimiento.innerHTML = chefs.map(c => {
            const platosChef = servidos.filter(h => h.chef === c.nombre);
            const alertasChef = historial.filter(h => h.chef === c.nombre && h.tuvoAlerta).length;
            const pEst = platosChef.length > 0 ? Math.round(platosChef.reduce((a, b) => a + b.etaMin, 0) / platosChef.length) : 0;
            const pReal = platosChef.length > 0 ? Math.round(platosChef.reduce((a, b) => a + b.tiempoRealMin, 0) / platosChef.length) : 0;

            return `
                <tr>
                    <td><strong>${c.nombre}</strong></td>
                    <td><span class="badge-comp comp-2">${(c.nivel || 'intermedio').toUpperCase()}</span></td>
                    <td>${platosChef.length} platos</td>
                    <td>${pEst} min</td>
                    <td style="font-weight:700; color:${pReal > pEst ? '#f87171' : '#4ade80'};">${pReal} min</td>
                    <td>${alertasChef}</td>
                </tr>
            `;
        }).join('');

        // 4. Tabla de Historial de Platos y Tiempos de Entrega
        const tbodyHist = document.getElementById('tabla-historial-body');
        if (historial.length === 0) {
            tbodyHist.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#71717a; padding:18px;">Aún no hay platos finalizados. Sirve un plato desde Cocina o pulsa "Generar Datos de Prueba (ANOVA)".</td></tr>`;
        } else {
            tbodyHist.innerHTML = historial.map(h => {
                const dif = h.tiempoRealMin - h.etaMin;
                const signo = dif > 0 ? `+${dif} min` : `${dif} min`;
                const colorDif = dif > 3 ? '#f87171' : '#4ade80';
                return `
                    <tr>
                        <td style="font-size:0.78em; color:#a1a1aa;">${h.fechaHora}</td>
                        <td><strong>${h.mesa}</strong></td>
                        <td>${h.plato}</td>
                        <td>Nivel ${h.complejidad}</td>
                        <td>${h.chef} <span style="color:#71717a; font-size:0.8em;">(${h.nivelChef})</span></td>
                        <td>${h.etaMin} min</td>
                        <td><strong>${h.tiempoRealMin} min</strong></td>
                        <td style="color:${colorDif}; font-weight:700;">${h.estadoFinal === 'Servido' ? signo : '--'}</td>
                        <td><span class="badge-comp ${h.estadoFinal === 'Servido' ? 'comp-1' : 'comp-3'}">${h.estadoFinal}</span></td>
                    </tr>
                `;
            }).join('');
        }

        // 5. Bitácora de Sesiones
        const tbodySesiones = document.getElementById('tabla-sesiones-body');
        tbodySesiones.innerHTML = logsSesiones.length === 0
            ? `<tr><td colspan="4" style="text-align:center; color:#71717a;">Sin registros de sesión.</td></tr>`
            : logsSesiones.slice(0, 25).map(l => `
                <tr>
                    <td style="font-size:0.8em; color:#a1a1aa;">${l.fechaHora}</td>
                    <td><strong>${l.nombre}</strong></td>
                    <td>${l.rol.toUpperCase()}</td>
                    <td style="color:${l.accion.includes('Inicio') ? '#4ade80' : '#facc15'}; font-weight:600;">${l.accion}</td>
                </tr>
            `).join('');
    }

    // Cambiar estatus del chef directamente desde el selector de la tabla
    window.cambiarEstatusChefDirecto = (id, nuevoNivel) => {
        const usuarios = obtenerUsuariosDB();
        const idx = usuarios.findIndex(u => u.id === parseInt(id));
        if (idx !== -1) {
            usuarios[idx].nivel = nuevoNivel;
            guardarUsuariosDB(usuarios);
            renderizarEmpleadosYAnaliticas();
        }
    };

    // CRUD Empleados
    window.mostrarOcultarNivelChef = () => {
        const rol = document.getElementById('emp-rol').value;
        document.getElementById('grupo-nivel-chef').style.display = rol === 'cocinero' ? 'flex' : 'none';
    };

    window.abrirModalEmpleado = () => {
        document.getElementById('form-empleado').reset();
        document.getElementById('emp-id').value = '';
        document.getElementById('modal-empleado-titulo').textContent = 'NUEVO EMPLEADO';
        mostrarOcultarNivelChef();
        document.getElementById('modal-empleado').classList.remove('hidden');
    };

    window.editarEmpleado = (id) => {
        const u = obtenerUsuariosDB().find(item => item.id === parseInt(id));
        if (!u) return;

        document.getElementById('emp-id').value = u.id;
        document.getElementById('emp-nombre').value = u.nombre;
        document.getElementById('emp-usuario').value = u.usuario;
        document.getElementById('emp-clave').value = u.clave;
        document.getElementById('emp-rol').value = u.rol;
        document.getElementById('emp-nivel').value = u.nivel !== 'n/a' ? u.nivel : 'intermedio';

        mostrarOcultarNivelChef();
        document.getElementById('modal-empleado-titulo').textContent = `EDITAR: ${u.nombre}`;
        document.getElementById('modal-empleado').classList.remove('hidden');
    };

    window.cerrarModalEmpleado = () => {
        document.getElementById('modal-empleado').classList.add('hidden');
    };

    window.guardarEmpleadoFormulario = (e) => {
        e.preventDefault();
        const usuarios = obtenerUsuariosDB();
        const idInput = document.getElementById('emp-id').value;
        const rol = document.getElementById('emp-rol').value;

        const datos = {
            nombre: document.getElementById('emp-nombre').value.trim(),
            usuario: document.getElementById('emp-usuario').value.trim(),
            clave: document.getElementById('emp-clave').value.trim(),
            rol,
            nivel: rol === 'cocinero' ? document.getElementById('emp-nivel').value : 'n/a',
            rendimiento: 1.0
        };

        if (idInput) {
            const idx = usuarios.findIndex(u => u.id === parseInt(idInput));
            if (idx !== -1) usuarios[idx] = { ...usuarios[idx], ...datos };
        } else {
            const maxId = usuarios.reduce((max, u) => (u.id > max ? u.id : max), 0);
            usuarios.push({ id: maxId + 1, online: false, ultimaEntrada: null, ultimaSalida: null, ...datos });
        }

        guardarUsuariosDB(usuarios);
        cerrarModalEmpleado();
        sincronizarTodoAdmin();
    };

    window.eliminarEmpleado = (id) => {
        const usuarios = obtenerUsuariosDB();
        const u = usuarios.find(item => item.id === parseInt(id));
        if (!u) return;

        if (confirm(`¿Eliminar al empleado "${u.nombre}" del sistema?`)) {
            guardarUsuariosDB(usuarios.filter(item => item.id !== parseInt(id)));
            sincronizarTodoAdmin();
        }
    };

    // Generar datos de prueba ANOVA para sustentar y sacar conclusiones
    window.simularDatosANOVA = () => {
        const muestras = [
            { mesa: 'Mesa 01', plato: 'Ensalada César con pollo', complejidad: 1, chef: 'Chef Lucas', nivelChef: 'principiante', etaMin: 12, tiempoRealMin: 13, tuvoAlerta: false, estadoFinal: 'Servido' },
            { mesa: 'Mesa 02', plato: 'Pasta alfredo con camarones', complejidad: 2, chef: 'Chef Andrés', nivelChef: 'intermedio', etaMin: 18, tiempoRealMin: 17, tuvoAlerta: false, estadoFinal: 'Servido' },
            { mesa: 'Mesa 03', plato: 'Risotto de hongos', complejidad: 3, chef: 'Chef Mateo', nivelChef: 'experto', etaMin: 20, tiempoRealMin: 19, tuvoAlerta: false, estadoFinal: 'Servido' },
            { mesa: 'Mesa 04', plato: 'Risotto de hongos', complejidad: 3, chef: 'Chef Lucas', nivelChef: 'principiante', etaMin: 48, tiempoRealMin: 52, tuvoAlerta: true, estadoFinal: 'Servido' },
            { mesa: 'Mesa 05', plato: 'Ensalada César con pollo', complejidad: 1, chef: 'Chef Mateo', nivelChef: 'experto', etaMin: 20, tiempoRealMin: 18, tuvoAlerta: false, estadoFinal: 'Servido' },
            { mesa: 'Mesa 02', plato: 'Pasta alfredo con camarones', complejidad: 2, chef: 'Chef Mateo', nivelChef: 'experto', etaMin: 24, tiempoRealMin: 22, tuvoAlerta: false, estadoFinal: 'Servido' }
        ];
        muestras.forEach(m => registrarPlatoEnHistorial(m));
        sincronizarTodoAdmin();
    };

    window.exportarHistorialCSV = () => {
        const historial = obtenerHistorialDB();
        if (historial.length === 0) {
            alert('No hay datos en el historial para exportar.');
            return;
        }
        const cabeceras = ['Fecha_Hora', 'Mesa', 'Plato', 'Complejidad', 'Chef', 'Nivel_Chef', 'ETA_Min', 'Tiempo_Real_Min', 'Estado'];
        const filas = historial.map(h => [
            `"${h.fechaHora}"`, `"${h.mesa}"`, `"${h.plato}"`, h.complejidad, `"${h.chef}"`, `"${h.nivelChef}"`, h.etaMin, h.tiempoRealMin, `"${h.estadoFinal}"`
        ].join(','));

        const csvContent = 'data:text/csv;charset=utf-8,' + [cabeceras.join(','), ...filas].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'reporte_tiempos_gastroflow.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.borrarHistorialConfirmado = () => {
        if (confirm('¿Deseas limpiar todo el historial de pedidos?')) {
            limpiarHistorialDB();
            sincronizarTodoAdmin();
        }
    };

    function sincronizarTodoAdmin() {
        renderizarMesasYAlertasLive();
        renderizarPersonalOnline();
        renderizarTablaMenu();
        renderizarEmpleadosYAnaliticas();
    }

    window.addEventListener('storage', () => sincronizarTodoAdmin());
    if (typeof canalGastroFlow !== 'undefined' && canalGastroFlow) {
        canalGastroFlow.onmessage = () => sincronizarTodoAdmin();
    }

    sincronizarTodoAdmin();
});