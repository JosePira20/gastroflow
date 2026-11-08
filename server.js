const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db_global.json');

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

// Estado global en memoria compartido por todos los dispositivos conectados a Azure
let estadoGlobal = {
  version: Date.now(),
  menu: null,
  usuarios: null,
  pedidos: { 1: null, 2: null, 3: null, 4: null, 5: null },
  historial: [],
  sesiones: []
};

// Si existe respaldo en disco del servidor, lo carga al iniciar
if (fs.existsSync(DB_FILE)) {
  try {
    const guardado = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (guardado && typeof guardado === 'object') {
      estadoGlobal = { ...estadoGlobal, ...guardado };
    }
  } catch (e) {
    console.error('Iniciando estado global limpio:', e.message);
  }
}

function guardarEstadoEnDisco() {
  estadoGlobal.version = Date.now();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(estadoGlobal), 'utf8');
  } catch (e) {
    console.error('No se pudo escribir db_global.json:', e.message);
  }
}

http.createServer((req, res) => {
  // Cabeceras CORS y de seguridad básicas para evitar alertas de navegadores/antivirus
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let ruta = decodeURIComponent(req.url.split('?')[0]);

  // ENDPOINTS DE SINCRONIZACIoN GLOBAL (/api/state y /api/sync)
  if (ruta === '/api/state' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    return res.end(JSON.stringify(estadoGlobal));
  }

  if (ruta === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5e6) req.socket.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { coleccion, datos } = payload;

        if (coleccion && Object.prototype.hasOwnProperty.call(estadoGlobal, coleccion)) {
          estadoGlobal[coleccion] = datos;
          guardarEstadoEnDisco();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, version: estadoGlobal.version }));
        }

        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, msg: 'Colección no válida' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, msg: 'JSON inválido' }));
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
      // Compatibilidad en Linux (Azure)
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
  console.log(`GastroFlow corriendo en puerto ${PORT}`);
});