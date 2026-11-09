// js/MockData.js - Cliente conectado a las tablas de PostgreSQL (/api/state y /api/sync)

const MODO_DEMO_GLOBAL = false;
const FACTOR_TIEMPO_GLOBAL = MODO_DEMO_GLOBAL ? 1000 : 60000;

const matrizANOVA = {
    'principiante': { 1: 12, 2: 25, 3: 48 },
    'intermedio':   { 1: 11, 2: 18, 3: 36 },
    'experto':      { 1: 20, 2: 24, 3: 20 }
};

const canalGastroFlow = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gastroflow_sync') : null;

// Variables alimentadas exclusivamente desde PostgreSQL
var menuGlobal = [];
var usuariosSistema = [];
var ultimaVersionNube = 0;
var ultimaHuellaDatos = '';
var bloqueandoEcoNube = false;

// =========================================================================
// SINCRONIZACIÓN CON POSTGRESQL (CADA 700ms) Y EVENTOS DE RE-RENDERIZADO
// =========================================================================
function notificarCambioGlobal(tipo = 'ACTUALIZACION_GENERAL') {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('gastroflow:update', { detail: { tipo } }));
    if (canalGastroFlow && !bloqueandoEcoNube) {
        canalGastroFlow.postMessage({ tipo });
    }
}

async function enviarColeccionANube(coleccion, datos) {
    if (bloqueandoEcoNube) return;
    try {
        const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coleccion, datos })
        });
        if (res.ok) {
            const info = await res.json();
            if (info && info.version) {
                ultimaVersionNube = info.version;
            }
        }
    } catch (e) {
        console.error('Error sincronizando con PostgreSQL:', e);
    }
}

async function sincronizarDesdeServidorAzure() {
    try {
        const res = await fetch('/api/state?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const estadoSQL = await res.json();

        const huellaRemota = JSON.stringify({
            p: estadoSQL.pedidos,
            m: estadoSQL.menu,
            u: estadoSQL.usuarios,
            h: estadoSQL.historial ? estadoSQL.historial.length : 0,
            r: estadoSQL.resenas ? estadoSQL.resenas.length : 0
        });

        if (estadoSQL.version !== ultimaVersionNube || huellaRemota !== ultimaHuellaDatos) {
            ultimaVersionNube = estadoSQL.version || Date.now();
            ultimaHuellaDatos = huellaRemota;
            bloqueandoEcoNube = true;

            if (Array.isArray(estadoSQL.menu)) {
                menuGlobal = estadoSQL.menu;
                localStorage.setItem('gastroflow_menu_db', JSON.stringify(estadoSQL.menu));
            }
            if (Array.isArray(estadoSQL.usuarios)) {
                usuariosSistema = estadoSQL.usuarios;
                localStorage.setItem('gastroflow_usuarios_db', JSON.stringify(estadoSQL.usuarios));
            }
            if (estadoSQL.pedidos) {
                localStorage.setItem('gastroflow_pedidos', JSON.stringify(estadoSQL.pedidos));
            }
            if (Array.isArray(estadoSQL.historial)) {
                localStorage.setItem('gastroflow_historial_db', JSON.stringify(estadoSQL.historial));
            }
            if (Array.isArray(estadoSQL.sesiones)) {
                localStorage.setItem('gastroflow_sesiones_log', JSON.stringify(estadoSQL.sesiones));
            }
            if (Array.isArray(estadoSQL.resenas)) {
                localStorage.setItem('gastroflow_resenas_db', JSON.stringify(estadoSQL.resenas));
            }

            notificarCambioGlobal('SYNC_POSTGRES');
            bloqueandoEcoNube = false;
        }
    } catch (e) {
        bloqueandoEcoNube = false;
    }
}

// =========================================================================
// GESTIÓN DE MENÚ (TABLA SQL: `platos`)
// =========================================================================
function obtenerMenuDB() {
    try {
        const data = JSON.parse(localStorage.getItem('gastroflow_menu_db'));
        if (Array.isArray(data)) menuGlobal = data;
    } catch (e) {}
    return menuGlobal;
}

function guardarMenuDB(nuevoMenu) {
    menuGlobal = nuevoMenu;
    localStorage.setItem('gastroflow_menu_db', JSON.stringify(nuevoMenu));
    notificarCambioGlobal('ACTUALIZACION_MENU');
    enviarColeccionANube('menu', nuevoMenu);
}

async function restaurarMenuOriginalDB() {
    try {
        await fetch('/api/menu/reset', { method: 'POST' });
        await sincronizarDesdeServidorAzure();
    } catch (e) {}
}

// =========================================================================
// GESTIÓN DE USUARIOS Y SESIONES (TABLAS SQL: `usuarios` y `sesiones_log`)
// =========================================================================
function obtenerUsuariosDB() {
    try {
        const data = JSON.parse(localStorage.getItem('gastroflow_usuarios_db'));
        if (Array.isArray(data)) usuariosSistema = data;
    } catch (e) {}
    return usuariosSistema;
}

function guardarUsuariosDB(nuevosUsuarios) {
    usuariosSistema = nuevosUsuarios;
    localStorage.setItem('gastroflow_usuarios_db', JSON.stringify(nuevosUsuarios));
    notificarCambioGlobal('ACTUALIZACION_USUARIOS');
    enviarColeccionANube('usuarios', nuevosUsuarios);
}

function obtenerLogSesiones() {
    try {
        return JSON.parse(localStorage.getItem('gastroflow_sesiones_log')) || [];
    } catch (e) {
        return [];
    }
}

function registrarEventoSesion(nombre, rol, accion) {
    const logs = obtenerLogSesiones();
    logs.unshift({
        id: Date.now(),
        nombre,
        rol,
        accion,
        fechaHora: new Date().toLocaleString('es-CO')
    });
    const logsRecortados = logs.slice(0, 100);
    localStorage.setItem('gastroflow_sesiones_log', JSON.stringify(logsRecortados));
    enviarColeccionANube('sesiones', logsRecortados);
}

// =========================================================================
// HISTORIAL DE PEDIDOS (TABLA SQL: `historial_pedidos`)
// =========================================================================
function obtenerHistorialDB() {
    try {
        return JSON.parse(localStorage.getItem('gastroflow_historial_db')) || [];
    } catch (e) {
        return [];
    }
}

function registrarPlatoEnHistorial(datosRegistro) {
    const historial = obtenerHistorialDB();

    if (datosRegistro.uid_instancia) {
        const idxExistente = historial.findIndex(h => h.uid_instancia === datosRegistro.uid_instancia);
        if (idxExistente !== -1) {
            historial[idxExistente] = { ...historial[idxExistente], ...datosRegistro };
            localStorage.setItem('gastroflow_historial_db', JSON.stringify(historial));
            notificarCambioGlobal('ACTUALIZACION_HISTORIAL');
            enviarColeccionANube('historial', historial);
            return;
        }
    }

    historial.unshift({
        id_registro: Date.now() + Math.floor(Math.random() * 1000),
        fechaHora: new Date().toLocaleString('es-CO'),
        ...datosRegistro
    });
    localStorage.setItem('gastroflow_historial_db', JSON.stringify(historial));
    notificarCambioGlobal('ACTUALIZACION_HISTORIAL');
    enviarColeccionANube('historial', historial);
}

function limpiarHistorialDB() {
    localStorage.setItem('gastroflow_historial_db', JSON.stringify([]));
    notificarCambioGlobal('ACTUALIZACION_HISTORIAL');
    enviarColeccionANube('historial', []);
}

// =========================================================================
// RESEÑAS Y CALIFICACIONES (TABLA SQL: `resenas_platos` + WEBHOOK MAKE)
// =========================================================================
function obtenerResenasDB() {
    try {
        return JSON.parse(localStorage.getItem('gastroflow_resenas_db')) || [];
    } catch (e) {
        return [];
    }
}

async function guardarResenaPlato(datos) {
    const resenas = obtenerResenasDB();
    const porcentajeDescuento = parseInt(datos.estrellas) <= 3 ? 20 : 15;
    const codigoCupon = `GASTRO${porcentajeDescuento}-${Math.floor(1000 + Math.random() * 9000)}`;

    const nuevaResena = {
        id_resena: Date.now() + Math.floor(Math.random() * 1000),
        fechaHora: new Date().toLocaleString('es-CO'),
        mesa: datos.mesa,
        uid_plato: datos.uid_plato,
        id_plato: datos.id_plato,
        plato: datos.plato,
        chef: datos.chef || 'Chef en turno',
        estrellas: parseInt(datos.estrellas) || 5,
        comentario: datos.comentario || '',
        email: datos.email || '',
        descuentoPorcentaje: porcentajeDescuento,
        cupon: datos.email ? codigoCupon : '',
        sentimiento: parseInt(datos.estrellas) >= 4 ? 'Positivo' : (parseInt(datos.estrellas) === 3 ? 'Neutro' : 'Negativo')
    };

    resenas.unshift(nuevaResena);
    localStorage.setItem('gastroflow_resenas_db', JSON.stringify(resenas));

    const historial = obtenerHistorialDB();
    let idxHist = historial.findIndex(h => h.uid_instancia && h.uid_instancia === datos.uid_plato);
    if (idxHist === -1) {
        idxHist = historial.findIndex(h => h.mesa === datos.mesa && h.plato === datos.plato && !h.estrellas);
    }

    if (idxHist !== -1) {
        historial[idxHist].estrellas = nuevaResena.estrellas;
        historial[idxHist].emailCliente = nuevaResena.email || '';
        historial[idxHist].comentarioCliente = nuevaResena.comentario || '';
        localStorage.setItem('gastroflow_historial_db', JSON.stringify(historial));
        enviarColeccionANube('historial', historial);
    }

    notificarCambioGlobal('ACTUALIZACION_RESENAS');

    try {
        await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaResena)
        });
    } catch (e) {
        enviarColeccionANube('resenas', resenas);
    }

    return nuevaResena;
}

// =========================================================================
// PEDIDOS EN MESAS (TABLA SQL: `pedidos_mesa`)
// =========================================================================
function obtenerPedidos() {
    try {
        const data = JSON.parse(localStorage.getItem('gastroflow_pedidos'));
        if (!data || typeof data !== 'object') {
            return { 1: null, 2: null, 3: null, 4: null, 5: null };
        }
        return data;
    } catch (e) {
        return { 1: null, 2: null, 3: null, 4: null, 5: null };
    }
}

function guardarTodosLosPedidos(pedidos) {
    localStorage.setItem('gastroflow_pedidos', JSON.stringify(pedidos));
    notificarCambioGlobal('ACTUALIZACION_PEDIDOS');
    enviarColeccionANube('pedidos', pedidos);
}

function archivarMesaEnHistorial(mesaId, pedidoAnterior) {
    if (!pedidoAnterior || !Array.isArray(pedidoAnterior.platos) || pedidoAnterior.platos.length === 0) return;

    const menu = obtenerMenuDB();
    const usuarios = obtenerUsuariosDB();
    const chefConectado = usuarios.find(u => u.rol === 'cocinero' && u.online) || usuarios.find(u => u.rol === 'cocinero');
    const ahora = Date.now();

    pedidoAnterior.platos.forEach((plato, idx) => {
        const uid = plato.uid_instancia || `${pedidoAnterior.id || 'ord'}_${mesaId}_${idx}`;
        plato.uid_instancia = uid;

        if (plato.archivado_en_historial) {
            if (plato.estrellas_calificacion || plato.email_cliente) {
                registrarPlatoEnHistorial({
                    uid_instancia: uid,
                    estrellas: plato.estrellas_calificacion || null,
                    emailCliente: plato.email_cliente || ''
                });
            }
            return;
        }

        const platoInfo = menu.find(p => p.id === parseInt(plato.id_plato));
        const chefNombre = plato.chef_nombre || (chefConectado ? chefConectado.nombre : 'Chef Mateo');
        const chefNivel = plato.chef_nivel || (chefConectado ? chefConectado.nivel : 'experto');
        const etaMin = calcularETAChef(plato.id_plato, chefNivel, 1.0);

        const inicioRef = plato.inicio_coccion || plato.timestamp_creacion || pedidoAnterior.id || ahora;
        const finRef = plato.fin_coccion || ahora;
        const tiempoRealMin = plato.tiempo_real_guardado || Math.max(1, Math.round((finRef - inicioRef) / FACTOR_TIEMPO_GLOBAL));

        plato.archivado_en_historial = true;

        registrarPlatoEnHistorial({
            uid_instancia: uid,
            mesa: `Mesa 0${mesaId}`,
            plato: plato.nombre,
            complejidad: platoInfo ? platoInfo.complejidad : 2,
            chef: chefNombre,
            nivelChef: chefNivel,
            etaMin: etaMin,
            tiempoRealMin: tiempoRealMin,
            tuvoAlerta: plato.tuvo_alerta_historica || plato.alerta_sala || false,
            estadoFinal: 'Servido',
            estrellas: plato.estrellas_calificacion || null,
            emailCliente: plato.email_cliente || ''
        });
    });
}

function actualizarPedidoMesa(mesaId, pedido) {
    const pedidos = obtenerPedidos();

    if (pedido === null && pedidos[mesaId] && Array.isArray(pedidos[mesaId].platos) && pedidos[mesaId].platos.length > 0) {
        archivarMesaEnHistorial(mesaId, pedidos[mesaId]);
    }

    pedidos[mesaId] = pedido;
    guardarTodosLosPedidos(pedidos);
}

function calcularETAChef(platoId, nivelChef = 'intermedio', rendimiento = 1.0) {
    const menu = obtenerMenuDB();
    const plato = menu.find(p => p.id === parseInt(platoId));
    const complejidad = plato ? plato.complejidad : 2;
    const nivel = matrizANOVA[nivelChef] ? nivelChef : 'intermedio';
    const tiempoBaseMatriz = matrizANOVA[nivel][complejidad] || 18;
    return Math.round(tiempoBaseMatriz * rendimiento);
}

// =========================================================================
// AUTENTICACIÓN REAL CONTRA TABLA SQL `usuarios` (/api/auth/login)
// =========================================================================
async function autenticarUsuario(usuario, clave) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, clave })
        });

        if (res.status === 401) {
            return null;
        }

        if (res.ok) {
            const data = await res.json();
            if (data && data.ok && data.user) {
                sessionStorage.setItem('gastroflow_user', JSON.stringify(data.user));
                await sincronizarDesdeServidorAzure();
                return data.user;
            }
        }
    } catch (e) {
        console.error('Error autenticando contra el servidor SQL:', e);
    }
    return null;
}

function obtenerSesionPersonal() {
    try {
        const userStr = sessionStorage.getItem('gastroflow_user');
        if (!userStr) return null;
        const sesionLocal = JSON.parse(userStr);
        const lista = obtenerUsuariosDB();
        const idx = lista.findIndex(u => u.id === sesionLocal.id || u.usuario === sesionLocal.usuario);

        if (idx !== -1) {
            if (!lista[idx].online) {
                lista[idx].online = true;
                guardarUsuariosDB(lista);
            }
            sessionStorage.setItem('gastroflow_user', JSON.stringify(lista[idx]));
            return lista[idx];
        }
        return sesionLocal;
    } catch (e) {
        return null;
    }
}

function cerrarSesionPersonal() {
    const userStr = sessionStorage.getItem('gastroflow_user');
    if (userStr) {
        try {
            const sesion = JSON.parse(userStr);
            const lista = obtenerUsuariosDB();
            const index = lista.findIndex(u => u.id === sesion.id || u.usuario === sesion.usuario);
            if (index !== -1) {
                const ahoraStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                lista[index].online = false;
                lista[index].ultimaSalida = ahoraStr;
                guardarUsuariosDB(lista);
                registrarEventoSesion(lista[index].nombre, lista[index].rol, 'Cierre de sesión');
            }
        } catch (e) {}
    }
    sessionStorage.removeItem('gastroflow_user');
    window.location.href = '../index.html';
}

function requerirRol(rolEsperado) {
    const sesion = obtenerSesionPersonal();
    if (!sesion || sesion.rol !== rolEsperado) {
        alert("Acceso denegado: Debes iniciar sesión con las credenciales correspondientes.");
        window.location.href = '../index.html';
    }
}

window.addEventListener('beforeunload', () => {
    const userStr = sessionStorage.getItem('gastroflow_user');
    if (!userStr) return;
    try {
        const sesion = JSON.parse(userStr);
        const lista = obtenerUsuariosDB();
        const index = lista.findIndex(u => u.id === sesion.id || u.usuario === sesion.usuario);
        if (index !== -1 && lista[index].online) {
            const ahoraStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lista[index].online = false;
            lista[index].ultimaSalida = ahoraStr;
            guardarUsuariosDB(lista);
            registrarEventoSesion(lista[index].nombre, lista[index].rol, 'Cierre de pestaña / sesión');
        }
    } catch (e) {}
});

window.addEventListener('storage', () => {
    menuGlobal = obtenerMenuDB();
    usuariosSistema = obtenerUsuariosDB();
});

// Descargar estado desde las tablas de PostgreSQL al instante y cada 700ms
sincronizarDesdeServidorAzure();
setInterval(sincronizarDesdeServidorAzure, 700);