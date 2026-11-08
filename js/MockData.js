// js/MockData.js

const MODO_DEMO_GLOBAL = false;
const FACTOR_TIEMPO_GLOBAL = MODO_DEMO_GLOBAL ? 1000 : 60000;

const MENU_SEMILLA = [
    { 
        id: 1, 
        nombre: "Ensalada César con pollo", 
        descripcion: "Lechuga romana fresca, pollo a la parrilla en láminas, crutones de masa madre, lascas de parmesano y aderezo césar artesanal.",
        alergenos: "Lácteos, Gluten",
        tiempoBase: 12, 
        complejidad: 1, 
        activo: true,
        img: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 2, 
        nombre: "Pasta alfredo con camarones", 
        descripcion: "Fettuccine al dente bañado en salsa alfredo cremosa de mantequilla y parmesano, coronado con camarones ecuatorianos al ajillo.",
        alergenos: "Lácteos, Gluten, Crustáceos",
        tiempoBase: 18, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 3, 
        nombre: "Risotto de hongos", 
        descripcion: "Arroz arborio cremoso mantecado con selección de hongos silvestres, vino blanco seco, aceite de trufa y Parmigiano-Reggiano.",
        alergenos: "Lácteos, Sulfitos (Vino blanco)",
        tiempoBase: 35, 
        complejidad: 3, 
        activo: true,
        img: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 4, 
        nombre: "Arroz Basmati al Limoncillo", 
        descripcion: "Arroz basmati perfumado con hierba de limón y salteado en mantequilla clarificada con infusión de jengibre fresco.",
        alergenos: "Lácteos (Mantequilla)",
        tiempoBase: 8, 
        complejidad: 1, 
        activo: true,
        img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 5, 
        nombre: "Pollo a la Plancha al Romero", 
        descripcion: "Pechuga de pollo orgánico marinada en romero silvestre, aceite de oliva virgen extra y emulsión de cítricos, servida sobre ensalada de brotes verdes.",
        alergenos: "Libre de alérgenos comunes",
        tiempoBase: 14, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 6, 
        nombre: "Lomo Fino en Reducción de Syrah", 
        descripcion: "Medallón de lomo de res a la parrilla napado con reducción de vino tinto Syrah y demi-glace de ternera, acompañado de vegetales baby en juliana.",
        alergenos: "Carne Roja, Sulfitos (Vino tinto)",
        tiempoBase: 25, 
        complejidad: 3, 
        activo: true,
        img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 7, 
        nombre: "Bisque de Mariscos & Coco", 
        descripcion: "Sopa cremosa de mariscos infusionada con leche de coco y jengibre, coronada con camarones ecuatorianos y calamar al grill.",
        alergenos: "Mariscos, Crustáceos, Moluscos",
        tiempoBase: 18, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 8, 
        nombre: "Burrata Trufada & Tomates Confitados", 
        descripcion: "Esfera de burrata artesanal sobre cama de tomates cherry confitados en balsámico añejo, infusionada con aceite de trufa blanca y brotes de albahaca fresca.",
        alergenos: "Lácteos (Burrata)",
        tiempoBase: 7, 
        complejidad: 1, 
        activo: true,
        img: "https://images.unsplash.com/photo-1546548970-71785318a17b?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 9, 
        nombre: "Tiradito de Corvina al Ají Amarillo", 
        descripcion: "Láminas finas de pesca fresca marinadas en leche de tigre de ají amarillo y maracuyá, acompañadas de camote glaseado y maíz cancha crujiente.",
        alergenos: "Pescado",
        tiempoBase: 12, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 10, 
        nombre: "Salmón Noruego en Costra de Frutos Secos", 
        descripcion: "Filete de salmón sellado a la plancha con costra crujiente de pistachos y almendras, servido sobre puré terso de camote y reducción de maracuyá.",
        alergenos: "Pescado, Frutos Secos (Pistacho, Almendra)",
        tiempoBase: 16, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 11, 
        nombre: "Volcán de Cacao 70% & Vainilla Bourbon", 
        descripcion: "Bizcocho tibio de chocolate oscuro ecuatoriano con centro fluido, acompañado de helado artesanal de vainilla de Madagascar.",
        alergenos: "Lácteos, Huevos, Gluten",
        tiempoBase: 10, 
        complejidad: 1, 
        activo: true,
        img: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=800&auto=format&fit=crop" 
    },
    { 
        id: 12, 
        nombre: "Pappardelle al ragú de ternera", 
        descripcion: "Pasta larga artesanal al huevo acompañada de un ragú de ternera cocinado a fuego lento durante 6 horas con vino tinto, vegetales de huerta y hierbas frescas.",
        alergenos: "Gluten, Lácteos, Huevos, Sulfitos",
        tiempoBase: 20, 
        complejidad: 2, 
        activo: true,
        img: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=800&auto=format&fit=crop" 
    }
];

const USUARIOS_SEMILLA = [
    { id: 1, usuario: "camarero", clave: "1234", rol: "camarero", nombre: "Carlos (Camarero)", nivel: "n/a", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
    { id: 2, usuario: "cocinero", clave: "1234", rol: "cocinero", nombre: "Chef Mateo", nivel: "experto", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
    { id: 3, usuario: "intermedio", clave: "1234", rol: "cocinero", nombre: "Chef Andrés", nivel: "intermedio", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
    { id: 4, usuario: "junior", clave: "1234", rol: "cocinero", nombre: "Chef Lucas", nivel: "principiante", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
    { id: 5, usuario: "admin", clave: "1234", rol: "admin", nombre: "Administración", nivel: "n/a", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null }
];

const matrizANOVA = {
    'principiante': { 1: 12, 2: 25, 3: 48 },
    'intermedio':   { 1: 11, 2: 18, 3: 36 },
    'experto':      { 1: 20, 2: 24, 3: 20 }
};

const canalGastroFlow = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gastroflow_sync') : null;

var menuGlobal = [];
var usuariosSistema = [];
var ultimaVersionNube = 0;
var bloqueandoEcoNube = false;

if (!localStorage.getItem('gastroflow_menu_db')) {
    localStorage.setItem('gastroflow_menu_db', JSON.stringify(MENU_SEMILLA));
}
if (!localStorage.getItem('gastroflow_usuarios_db')) {
    localStorage.setItem('gastroflow_usuarios_db', JSON.stringify(USUARIOS_SEMILLA));
}
if (!localStorage.getItem('gastroflow_pedidos')) {
    localStorage.setItem('gastroflow_pedidos', JSON.stringify({ 1: null, 2: null, 3: null, 4: null, 5: null }));
}
if (!localStorage.getItem('gastroflow_historial_db')) {
    localStorage.setItem('gastroflow_historial_db', JSON.stringify([]));
}
if (!localStorage.getItem('gastroflow_sesiones_log')) {
    localStorage.setItem('gastroflow_sesiones_log', JSON.stringify([]));
}

// =========================================================================
// COMUNICACIÓN CON EL SERVIDOR GLOBAL EN AZURE (/api/sync y /api/state)
// =========================================================================
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
        // Funciona en modo local si no hay servidor activo
    }
}

async function sincronizarDesdeServidorAzure() {
    try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const estadoRemoto = await res.json();

        // Si el servidor en Azure está recién iniciado, lo inicializamos con los datos actuales
        if (!estadoRemoto.menu || !estadoRemoto.usuarios) {
            await enviarColeccionANube('menu', obtenerMenuDB());
            await enviarColeccionANube('usuarios', obtenerUsuariosDB());
            await enviarColeccionANube('pedidos', obtenerPedidos());
            await enviarColeccionANube('historial', obtenerHistorialDB());
            await enviarColeccionANube('sesiones', obtenerLogSesiones());
            return;
        }

        if (estadoRemoto.version && estadoRemoto.version !== ultimaVersionNube) {
            ultimaVersionNube = estadoRemoto.version;
            bloqueandoEcoNube = true;

            if (estadoRemoto.menu) localStorage.setItem('gastroflow_menu_db', JSON.stringify(estadoRemoto.menu));
            if (estadoRemoto.usuarios) localStorage.setItem('gastroflow_usuarios_db', JSON.stringify(estadoRemoto.usuarios));
            if (estadoRemoto.pedidos) localStorage.setItem('gastroflow_pedidos', JSON.stringify(estadoRemoto.pedidos));
            if (estadoRemoto.historial) localStorage.setItem('gastroflow_historial_db', JSON.stringify(estadoRemoto.historial));
            if (estadoRemoto.sesiones) localStorage.setItem('gastroflow_sesiones_log', JSON.stringify(estadoRemoto.sesiones));

            menuGlobal = obtenerMenuDB();
            usuariosSistema = obtenerUsuariosDB();

            notificarCambioGlobal('SYNC_CLOUD');
            bloqueandoEcoNube = false;
        }
    } catch (e) {
        // Modo offline local
    }
}

function notificarCambioGlobal(tipo = 'ACTUALIZACION_GENERAL') {
    window.dispatchEvent(new Event('storage'));
    if (canalGastroFlow) {
        canalGastroFlow.postMessage({ tipo });
    }
}

// =========================================================================
// GESTIÓN DE MENÚ
// =========================================================================
function obtenerMenuDB() {
    try {
        const data = JSON.parse(localStorage.getItem('gastroflow_menu_db'));
        menuGlobal = Array.isArray(data) && data.length > 0 ? data : MENU_SEMILLA;
    } catch (e) {
        menuGlobal = MENU_SEMILLA;
    }
    return menuGlobal;
}

function guardarMenuDB(nuevoMenu) {
    menuGlobal = nuevoMenu;
    localStorage.setItem('gastroflow_menu_db', JSON.stringify(nuevoMenu));
    notificarCambioGlobal('ACTUALIZACION_MENU');
    enviarColeccionANube('menu', nuevoMenu);
}

function restaurarMenuOriginalDB() {
    guardarMenuDB(MENU_SEMILLA);
}

// =========================================================================
// GESTIÓN DE USUARIOS Y BITÁCORA DE SESIONES
// =========================================================================
function obtenerUsuariosDB() {
    try {
        const data = JSON.parse(localStorage.getItem('gastroflow_usuarios_db'));
        usuariosSistema = Array.isArray(data) && data.length > 0 ? data : USUARIOS_SEMILLA;
    } catch (e) {
        usuariosSistema = USUARIOS_SEMILLA;
    }
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
// HISTORIAL DE PEDIDOS Y RENDIMIENTO DE CHEFS
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
// PEDIDOS EN MESAS + ARCHIVO AUTOMÁTICO AL LIBERAR LA MESA
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
        if (plato.archivado_en_historial) return;

        const platoInfo = menu.find(p => p.id === parseInt(plato.id_plato));
        const chefNombre = plato.chef_nombre || (chefConectado ? chefConectado.nombre : 'Chef Mateo');
        const chefNivel = plato.chef_nivel || (chefConectado ? chefConectado.nivel : 'experto');
        const etaMin = calcularETAChef(plato.id_plato, chefNivel, 1.0);

        const inicioRef = plato.inicio_coccion || plato.timestamp_creacion || pedidoAnterior.id || ahora;
        const finRef = plato.fin_coccion || ahora;
        const tiempoRealMin = plato.tiempo_real_guardado || Math.max(1, Math.round((finRef - inicioRef) / FACTOR_TIEMPO_GLOBAL));

        const uid = plato.uid_instancia || `${pedidoAnterior.id || ahora}_${mesaId}_${idx}`;
        plato.uid_instancia = uid;
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
            estadoFinal: 'Servido'
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
// AUTENTICACIÓN Y CIERRE AUTOMÁTICO AL CERRAR PESTAÑA
// =========================================================================
function autenticarUsuario(usuario, clave) {
    const lista = obtenerUsuariosDB();
    const index = lista.findIndex(u => u.usuario === usuario && u.clave === clave);

    if (index !== -1) {
        const ahoraStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lista[index].online = true;
        lista[index].ultimaEntrada = ahoraStr;
        guardarUsuariosDB(lista);

        registrarEventoSesion(lista[index].nombre, lista[index].rol, 'Inicio de sesión');
        sessionStorage.setItem('gastroflow_user', JSON.stringify(lista[index]));
        return lista[index];
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

menuGlobal = obtenerMenuDB();
usuariosSistema = obtenerUsuariosDB();

window.addEventListener('storage', () => {
    menuGlobal = obtenerMenuDB();
    usuariosSistema = obtenerUsuariosDB();
});

// Iniciar sincronización global con Azure cada 1.5 segundos
sincronizarDesdeServidorAzure();
setInterval(sincronizarDesdeServidorAzure, 1500);