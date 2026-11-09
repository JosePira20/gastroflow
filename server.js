// server.js - Backend Full-Stack con PostgreSQL (Docker / Azure) + Webhook Make
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db_global.json');
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || '';

// Conexión a tu contenedor Docker local (o DATABASE_URL en Azure)
const connectionString = process.env.DATABASE_URL || 'postgresql://admin_gastro:password1234@127.0.0.1:5432/gastroflow_db';
const usarSSL = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('127.0.0.1') && !process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString,
  ssl: usarSSL ? { rejectUnauthorized: false } : false
});

let pgActivo = false;
let versionGlobal = Date.now();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const MENU_INICIAL = [
  { id: 1, nombre: "Ensalada César con pollo", descripcion: "Lechuga romana fresca, pollo a la parrilla en láminas, crutones de masa madre, lascas de parmesano y aderezo césar artesanal.", alergenos: "Lácteos, Gluten", tiempoBase: 12, complejidad: 1, activo: true, img: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=800&auto=format&fit=crop" },
  { id: 2, nombre: "Pasta alfredo con camarones", descripcion: "Fettuccine al dente bañado en salsa alfredo cremosa de mantequilla y parmesano, coronado con camarones ecuatorianos al ajillo.", alergenos: "Lácteos, Gluten, Crustáceos", tiempoBase: 18, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop" },
  { id: 3, nombre: "Risotto de hongos", descripcion: "Arroz arborio cremoso mantecado con selección de hongos silvestres, vino blanco seco, aceite de trufa y Parmigiano-Reggiano.", alergenos: "Lácteos, Sulfitos (Vino blanco)", tiempoBase: 35, complejidad: 3, activo: true, img: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?q=80&w=800&auto=format&fit=crop" },
  { id: 4, nombre: "Arroz Basmati al Limoncillo", descripcion: "Arroz basmati perfumado con hierba de limón y salteado en mantequilla clarificada con infusión de jengibre fresco.", alergenos: "Lácteos (Mantequilla)", tiempoBase: 8, complejidad: 1, activo: true, img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop" },
  { id: 5, nombre: "Pollo a la Plancha al Romero", descripcion: "Pechuga de pollo orgánico marinada en romero silvestre, aceite de oliva virgen extra y emulsión de cítricos, servida sobre ensalada de brotes verdes.", alergenos: "Libre de alérgenos comunes", tiempoBase: 14, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=800&auto=format&fit=crop" },
  { id: 6, nombre: "Lomo Fino en Reducción de Syrah", descripcion: "Medallón de lomo de res a la parrilla napado con reducción de vino tinto Syrah y demi-glace de ternera, acompañado de vegetales baby en juliana.", alergenos: "Carne Roja, Sulfitos (Vino tinto)", tiempoBase: 25, complejidad: 3, activo: true, img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop" },
  { id: 7, nombre: "Bisque de Mariscos & Coco", descripcion: "Sopa cremosa de mariscos infusionada con leche de coco y jengibre, coronada con camarones ecuatorianos y calamar al grill.", alergenos: "Mariscos, Crustáceos, Moluscos", tiempoBase: 18, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop" },
  { id: 8, nombre: "Burrata Trufada & Tomates Confitados", descripcion: "Esfera de burrata artesanal sobre cama de tomates cherry confitados en balsámico añejo, infusionada con aceite de trufa blanca y brotes de albahaca fresca.", alergenos: "Lácteos (Burrata)", tiempoBase: 7, complejidad: 1, activo: true, img: "https://images.unsplash.com/photo-1546548970-71785318a17b?q=80&w=800&auto=format&fit=crop" },
  { id: 9, nombre: "Tiradito de Corvina al Ají Amarillo", descripcion: "Láminas finas de pesca fresca marinadas en leche de tigre de ají amarillo y maracuyá, acompañadas de camote glaseado y maíz cancha crujiente.", alergenos: "Pescado", tiempoBase: 12, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?q=80&w=800&auto=format&fit=crop" },
  { id: 10, nombre: "Salmón Noruego en Costra de Frutos Secos", descripcion: "Filete de salmón sellado a la plancha con costra crujiente de pistachos y almendras, servido sobre puré terso de camote y reducción de maracuyá.", alergenos: "Pescado, Frutos Secos (Pistacho, Almendra)", tiempoBase: 16, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop" },
  { id: 11, nombre: "Volcán de Cacao 70% & Vainilla Bourbon", descripcion: "Bizcocho tibio de chocolate oscuro ecuatoriano con centro fluido, acompañado de helado artesanal de vainilla de Madagascar.", alergenos: "Lácteos, Huevos, Gluten", tiempoBase: 10, complejidad: 1, activo: true, img: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=800&auto=format&fit=crop" },
  { id: 12, nombre: "Pappardelle al ragú de ternera", descripcion: "Pasta larga artesanal al huevo acompañada de un ragú de ternera cocinado a fuego lento durante 6 horas con vino tinto, vegetales de huerta y hierbas frescas.", alergenos: "Gluten, Lácteos, Huevos, Sulfitos", tiempoBase: 20, complejidad: 2, activo: true, img: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=800&auto=format&fit=crop" }
];

const USUARIOS_INICIALES = [
  { id: 1, usuario: "camarero", clave: "1234", rol: "camarero", nombre: "Carlos (Camarero)", nivel: "n/a", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
  { id: 2, usuario: "cocinero", clave: "1234", rol: "cocinero", nombre: "Chef Mateo", nivel: "experto", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
  { id: 3, usuario: "intermedio", clave: "1234", rol: "cocinero", nombre: "Chef Andrés", nivel: "intermedio", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
  { id: 4, usuario: "junior", clave: "1234", rol: "cocinero", nombre: "Chef Lucas", nivel: "principiante", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null },
  { id: 5, usuario: "admin", clave: "1234", rol: "admin", nombre: "Administración", nivel: "n/a", rendimiento: 1.0, online: false, ultimaEntrada: null, ultimaSalida: null }
];

let estadoRespaldo = {
  version: versionGlobal,
  menu: MENU_INICIAL,
  usuarios: USUARIOS_INICIALES,
  pedidos: { 1: null, 2: null, 3: null, 4: null, 5: null },
  historial: [],
  sesiones: [],
  resenas: []
};

if (fs.existsSync(DB_FILE)) {
  try {
    estadoRespaldo = { ...estadoRespaldo, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch (e) {}
}

function guardarRespaldoDisco() {
  versionGlobal = Date.now();
  estadoRespaldo.version = versionGlobal;
  try { fs.writeFileSync(DB_FILE, JSON.stringify(estadoRespaldo), 'utf8'); } catch (e) {}
}

async function inicializarPostgreSQL() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platos (
        id INTEGER PRIMARY KEY,
        nombre VARCHAR(180) NOT NULL,
        descripcion TEXT,
        alergenos VARCHAR(250),
        tiempo_base INTEGER NOT NULL DEFAULT 15,
        complejidad INTEGER NOT NULL DEFAULT 2,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        img TEXT
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY,
        usuario VARCHAR(80) UNIQUE NOT NULL,
        clave VARCHAR(120) NOT NULL,
        rol VARCHAR(40) NOT NULL,
        nombre VARCHAR(140) NOT NULL,
        nivel VARCHAR(40) DEFAULT 'n/a',
        rendimiento NUMERIC(4,2) DEFAULT 1.0,
        online BOOLEAN DEFAULT FALSE,
        ultima_entrada VARCHAR(40),
        ultima_salida VARCHAR(40)
      );

      CREATE TABLE IF NOT EXISTS pedidos_mesa (
        mesa_id INTEGER PRIMARY KEY,
        orden_id BIGINT,
        platos_json JSONB
      );

      CREATE TABLE IF NOT EXISTS historial_pedidos (
        id_registro BIGINT PRIMARY KEY,
        uid_instancia VARCHAR(120),
        fecha_hora VARCHAR(80),
        mesa VARCHAR(30),
        plato VARCHAR(180),
        complejidad INTEGER,
        chef VARCHAR(140),
        nivel_chef VARCHAR(40),
        eta_min INTEGER,
        tiempo_real_min INTEGER,
        tuvo_alerta BOOLEAN DEFAULT FALSE,
        estado_final VARCHAR(50),
        estrellas INTEGER,
        email_cliente VARCHAR(180),
        comentario_cliente TEXT
      );

      CREATE TABLE IF NOT EXISTS resenas_platos (
        id_resena BIGINT PRIMARY KEY,
        fecha_hora VARCHAR(80),
        mesa VARCHAR(30),
        uid_plato VARCHAR(120),
        id_plato INTEGER,
        plato VARCHAR(180),
        chef VARCHAR(140),
        estrellas INTEGER,
        comentario TEXT,
        email VARCHAR(180),
        descuento_porcentaje INTEGER,
        cupon VARCHAR(80),
        sentimiento VARCHAR(40),
        respuesta_ia TEXT
      );

      CREATE TABLE IF NOT EXISTS sesiones_log (
        id BIGINT PRIMARY KEY,
        nombre VARCHAR(140),
        rol VARCHAR(40),
        accion VARCHAR(120),
        fecha_hora VARCHAR(80)
      );
    `);

    const { rows: countPlatos } = await pool.query('SELECT COUNT(*)::int AS total FROM platos');
    if (countPlatos[0].total === 0) {
      for (const p of MENU_INICIAL) {
        await pool.query(
          `INSERT INTO platos (id, nombre, descripcion, alergenos, tiempo_base, complejidad, activo, img)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [p.id, p.nombre, p.descripcion, p.alergenos, p.tiempoBase, p.complejidad, p.activo, p.img]
        );
      }
    }

    const { rows: countUsers } = await pool.query('SELECT COUNT(*)::int AS total FROM usuarios');
    if (countUsers[0].total === 0) {
      for (const u of USUARIOS_INICIALES) {
        await pool.query(
          `INSERT INTO usuarios (id, usuario, clave, rol, nombre, nivel, rendimiento, online, ultima_entrada, ultima_salida)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [u.id, u.usuario, u.clave, u.rol, u.nombre, u.nivel, u.rendimiento, u.online, u.ultimaEntrada, u.ultimaSalida]
        );
      }
    }

    const { rows: countMesas } = await pool.query('SELECT COUNT(*)::int AS total FROM pedidos_mesa');
    if (countMesas[0].total === 0) {
      for (let m = 1; m <= 5; m++) {
        await pool.query(`INSERT INTO pedidos_mesa (mesa_id, orden_id, platos_json) VALUES ($1, NULL, NULL)`, [m]);
      }
    }

    pgActivo = true;
    console.log('✅ Conectado a PostgreSQL exitosamente. Tablas listas para TablePlus.');
  } catch (err) {
    pgActivo = false;
    console.warn('⚠️ PostgreSQL no detectado, operando con respaldo en disco:', err.message);
  }
}

inicializarPostgreSQL();

async function obtenerEstadoDesdePG() {
  if (!pgActivo) return estadoRespaldo;

  const platosRes = await pool.query('SELECT * FROM platos ORDER BY id ASC');
  const menu = platosRes.rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    alergenos: r.alergenos,
    tiempoBase: r.tiempo_base,
    complejidad: r.complejidad,
    activo: r.activo,
    img: r.img
  }));

  const usersRes = await pool.query('SELECT * FROM usuarios ORDER BY id ASC');
  const usuarios = usersRes.rows.map(u => ({
    id: u.id,
    usuario: u.usuario,
    clave: u.clave,
    rol: u.rol,
    nombre: u.nombre,
    nivel: u.nivel,
    rendimiento: parseFloat(u.rendimiento) || 1.0,
    online: u.online,
    ultimaEntrada: u.ultima_entrada,
    ultimaSalida: u.ultima_salida
  }));

  const mesasRes = await pool.query('SELECT * FROM pedidos_mesa ORDER BY mesa_id ASC');
  const pedidos = { 1: null, 2: null, 3: null, 4: null, 5: null };
  mesasRes.rows.forEach(m => {
    if (m.platos_json && Array.isArray(m.platos_json) && m.platos_json.length > 0) {
      pedidos[m.mesa_id] = { id: Number(m.orden_id) || Date.now(), platos: m.platos_json };
    } else {
      pedidos[m.mesa_id] = null;
    }
  });

  const histRes = await pool.query('SELECT * FROM historial_pedidos ORDER BY id_registro DESC LIMIT 300');
  const historial = histRes.rows.map(h => ({
    id_registro: Number(h.id_registro),
    uid_instancia: h.uid_instancia,
    fechaHora: h.fecha_hora,
    mesa: h.mesa,
    plato: h.plato,
    complejidad: h.complejidad,
    chef: h.chef,
    nivelChef: h.nivel_chef,
    etaMin: h.eta_min,
    tiempoRealMin: h.tiempo_real_min,
    tuvoAlerta: h.tuvo_alerta,
    estadoFinal: h.estado_final,
    estrellas: h.estrellas,
    emailCliente: h.email_cliente || '',
    comentarioCliente: h.comentario_cliente || ''
  }));

  const resenasRes = await pool.query('SELECT * FROM resenas_platos ORDER BY id_resena DESC LIMIT 200');
  const resenas = resenasRes.rows.map(r => ({
    id_resena: Number(r.id_resena),
    fechaHora: r.fecha_hora,
    mesa: r.mesa,
    uid_plato: r.uid_plato,
    id_plato: r.id_plato,
    plato: r.plato,
    chef: r.chef,
    estrellas: r.estrellas,
    comentario: r.comentario,
    email: r.email,
    descuentoPorcentaje: r.descuento_porcentaje,
    cupon: r.cupon,
    sentimiento: r.sentimiento,
    respuesta_ia: r.respuesta_ia
  }));

  const sesRes = await pool.query('SELECT * FROM sesiones_log ORDER BY id DESC LIMIT 100');
  const sesiones = sesRes.rows.map(s => ({
    id: Number(s.id),
    nombre: s.nombre,
    rol: s.rol,
    accion: s.accion,
    fechaHora: s.fecha_hora
  }));

  return {
    version: versionGlobal,
    menu,
    usuarios,
    pedidos,
    historial,
    resenas,
    sesiones
  };
}

async function sincronizarColeccionEnPG(coleccion, datos) {
  estadoRespaldo[coleccion] = datos;
  guardarRespaldoDisco();

  if (!pgActivo) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (coleccion === 'menu' && Array.isArray(datos)) {
      await client.query('DELETE FROM platos');
      for (const p of datos) {
        await client.query(
          `INSERT INTO platos (id, nombre, descripcion, alergenos, tiempo_base, complejidad, activo, img)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [p.id, p.nombre, p.descripcion || '', p.alergenos || '', p.tiempoBase || 15, p.complejidad || 2, p.activo !== false, p.img || '']
        );
      }
    } else if (coleccion === 'usuarios' && Array.isArray(datos)) {
      await client.query('DELETE FROM usuarios');
      for (const u of datos) {
        await client.query(
          `INSERT INTO usuarios (id, usuario, clave, rol, nombre, nivel, rendimiento, online, ultima_entrada, ultima_salida)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [u.id, u.usuario, u.clave, u.rol, u.nombre, u.nivel || 'n/a', u.rendimiento || 1.0, !!u.online, u.ultimaEntrada || null, u.ultimaSalida || null]
        );
      }
    } else if (coleccion === 'pedidos' && datos && typeof datos === 'object') {
      for (let m = 1; m <= 5; m++) {
        const ord = datos[m];
        if (ord && Array.isArray(ord.platos) && ord.platos.length > 0) {
          await client.query(
            `INSERT INTO pedidos_mesa (mesa_id, orden_id, platos_json)
             VALUES ($1, $2, $3)
             ON CONFLICT (mesa_id) DO UPDATE SET orden_id = EXCLUDED.orden_id, platos_json = EXCLUDED.platos_json`,
            [m, ord.id || Date.now(), JSON.stringify(ord.platos)]
          );
        } else {
          await client.query(
            `INSERT INTO pedidos_mesa (mesa_id, orden_id, platos_json)
             VALUES ($1, NULL, NULL)
             ON CONFLICT (mesa_id) DO UPDATE SET orden_id = NULL, platos_json = NULL`,
            [m]
          );
        }
      }
    } else if (coleccion === 'historial' && Array.isArray(datos)) {
      await client.query('DELETE FROM historial_pedidos');
      for (const h of datos) {
        await client.query(
          `INSERT INTO historial_pedidos
           (id_registro, uid_instancia, fecha_hora, mesa, plato, complejidad, chef, nivel_chef, eta_min, tiempo_real_min, tuvo_alerta, estado_final, estrellas, email_cliente, comentario_cliente)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id_registro) DO NOTHING`,
          [
            h.id_registro || Date.now(),
            h.uid_instancia || null,
            h.fechaHora || '',
            h.mesa || '',
            h.plato || '',
            h.complejidad || 2,
            h.chef || '',
            h.nivelChef || 'experto',
            h.etaMin || 15,
            h.tiempoRealMin || 15,
            !!h.tuvoAlerta,
            h.estadoFinal || 'Servido',
            h.estrellas || null,
            h.emailCliente || '',
            h.comentarioCliente || ''
          ]
        );
      }
    } else if (coleccion === 'sesiones' && Array.isArray(datos)) {
      await client.query('DELETE FROM sesiones_log');
      for (const s of datos) {
        await client.query(
          `INSERT INTO sesiones_log (id, nombre, rol, accion, fecha_hora)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [s.id || Date.now(), s.nombre || '', s.rol || '', s.accion || '', s.fechaHora || '']
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error SQL en colección ${coleccion}:`, err.message);
  } finally {
    client.release();
  }
}

function dispararWebhookMake(datosResena) {
  if (!MAKE_WEBHOOK_URL || !MAKE_WEBHOOK_URL.startsWith('http')) return;
  try {
    const urlObj = new URL(MAKE_WEBHOOK_URL);
    const payload = JSON.stringify(datosResena);
    const clienteHttp = urlObj.protocol === 'https:' ? https : http;

    const req = clienteHttp.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => { res.on('data', () => {}); });

    req.on('error', (e) => console.error('Error enviando a Make:', e.message));
    req.write(payload);
    req.end();
  } catch (err) {}
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let ruta = decodeURIComponent(req.url.split('?')[0]);

  if (ruta === '/api/state' && req.method === 'GET') {
    try {
      const estado = await obtenerEstadoDesdePG();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      return res.end(JSON.stringify(estado));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(estadoRespaldo));
    }
  }

  if (ruta === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { usuario, clave } = JSON.parse(body);
        const ahoraStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const fechaCompleta = new Date().toLocaleString('es-CO');

        if (pgActivo) {
          const { rows } = await pool.query(
            `UPDATE usuarios
             SET online = TRUE, ultima_entrada = $1
             WHERE LOWER(usuario) = LOWER($2) AND clave = $3
             RETURNING *`,
            [ahoraStr, (usuario || '').trim(), (clave || '').trim()]
          );

          if (rows.length === 0) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ ok: false, msg: 'Credenciales inválidas' }));
          }

          const u = rows[0];
          await pool.query(
            `INSERT INTO sesiones_log (id, nombre, rol, accion, fecha_hora) VALUES ($1, $2, $3, $4, $5)`,
            [Date.now(), u.nombre, u.rol, 'Inicio de sesión (SQL)', fechaCompleta]
          );

          versionGlobal = Date.now();
          const userFormateado = {
            id: u.id,
            usuario: u.usuario,
            rol: u.rol,
            nombre: u.nombre,
            nivel: u.nivel,
            rendimiento: parseFloat(u.rendimiento) || 1.0,
            online: true,
            ultimaEntrada: u.ultima_entrada,
            ultimaSalida: u.ultima_salida
          };

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, user: userFormateado, version: versionGlobal }));
        } else {
          const idx = estadoRespaldo.usuarios.findIndex(
            x => x.usuario.toLowerCase() === (usuario || '').trim().toLowerCase() && x.clave === (clave || '').trim()
          );
          if (idx === -1) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ ok: false, msg: 'Credenciales inválidas' }));
          }
          estadoRespaldo.usuarios[idx].online = true;
          estadoRespaldo.usuarios[idx].ultimaEntrada = ahoraStr;
          guardarRespaldoDisco();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, user: estadoRespaldo.usuarios[idx], version: versionGlobal }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, msg: err.message }));
      }
    });
    return;
  }

  if (ruta === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5e6) req.socket.destroy();
    });
    req.on('end', async () => {
      try {
        const { coleccion, datos } = JSON.parse(body);
        await sincronizarColeccionEnPG(coleccion, datos);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: true, version: versionGlobal }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, msg: err.message }));
      }
    });
    return;
  }

  if (ruta === '/api/reviews' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const r = JSON.parse(body);
        estadoRespaldo.resenas.unshift(r);
        guardarRespaldoDisco();

        if (pgActivo) {
          await pool.query(
            `INSERT INTO resenas_platos
             (id_resena, fecha_hora, mesa, uid_plato, id_plato, plato, chef, estrellas, comentario, email, descuento_porcentaje, cupon, sentimiento, respuesta_ia)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (id_resena) DO NOTHING`,
            [
              r.id_resena || Date.now(),
              r.fechaHora || '',
              r.mesa || '',
              r.uid_plato || '',
              r.id_plato || 1,
              r.plato || '',
              r.chef || '',
              r.estrellas || 5,
              r.comentario || '',
              r.email || '',
              r.descuentoPorcentaje || 15,
              r.cupon || '',
              r.sentimiento || 'Positivo',
              r.respuesta_ia || null
            ]
          );

          await pool.query(
            `UPDATE historial_pedidos
             SET estrellas = $1, email_cliente = $2, comentario_cliente = $3
             WHERE uid_instancia = $4 OR (mesa = $5 AND plato = $6 AND estrellas IS NULL)`,
            [r.estrellas || 5, r.email || '', r.comentario || '', r.uid_plato || '', r.mesa || '', r.plato || '']
          );
        }

        dispararWebhookMake(r);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: true, version: versionGlobal, resena: r }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, msg: err.message }));
      }
    });
    return;
  }

  if (ruta.endsWith('/')) ruta += 'index.html';
  let archivo = path.normalize(path.join(__dirname, ruta));
  if (!archivo.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(archivo, (err, data) => {
    if (err) {
      const dir = path.dirname(archivo);
      const base = path.basename(archivo);
      const altBase = base.toLowerCase() === 'index.html'
        ? (base === 'index.html' ? 'Index.html' : 'index.html')
        : null;

      if (altBase) {
        const archivoAlt = path.join(dir, altBase);
        return fs.readFile(archivoAlt, (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            return res.end('No encontrado');
          }
          res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivoAlt)] || 'application/octet-stream' });
          return res.end(data2);
        });
      }
      res.writeHead(404);
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`🚀 GastroFlow Server corriendo en http://localhost:${PORT}`);
});