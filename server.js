const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const multer = require('multer');
const mysql = require('mysql2/promise');

const root = __dirname;
const dataDirectory = path.join(root, 'data');
const projectsFile = path.join(dataDirectory, 'projects.json');
const assignmentDirectory = path.join(dataDirectory, 'assignments');
const password = process.env.PORTFOLIO_ADMIN_PASSWORD;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const databaseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
const maxAssignmentFileSize = 10 * 1024 * 1024;
const allowedAssignmentFiles = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  '.ppt': ['application/vnd.ms-powerpoint', 'application/octet-stream'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
};
const sessionLifetime = 8 * 60 * 60 * 1000;
const sessions = new Map();
let database;
const defaultProjects = [
  {
    id: 'default-0',
    title: 'Ciremai Hiking Guide',
    category: 'DESAIN UI/UX',
    status: 'Konsep',
    description: 'Rancangan aplikasi yang memuat informasi jalur dan persiapan pendakian.',
    tags: ['Figma', 'User Flow', 'Wireframe'],
    templateIndex: 0,
    image: null,
    imagePositionX: 50,
    imagePositionY: 50
  },
  {
    id: 'default-1',
    title: 'Sistem Pelaporan Fasilitas',
    category: 'PENGEMBANGAN WEB',
    status: 'Dalam proses',
    description: 'Rancangan aplikasi untuk melaporkan kerusakan fasilitas kampus.',
    tags: ['HTML/CSS', 'JavaScript', 'Pengembangan'],
    templateIndex: 1,
    image: null,
    imagePositionX: 50,
    imagePositionY: 50
  },
  {
    id: 'default-2',
    title: 'ML Prediction Playground',
    category: 'MACHINE LEARNING',
    status: 'Rencana belajar',
    description: 'Latihan untuk mempelajari pengolahan data dan dasar model prediksi.',
    tags: ['Python', 'Dataset', 'Model Prediksi'],
    templateIndex: 2,
    image: null,
    imagePositionX: 50,
    imagePositionY: 50
  }
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const assignmentUpload = multer({
  storage: multer.diskStorage({
    destination: assignmentDirectory,
    filename: (request, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: { fileSize: maxAssignmentFileSize, files: 1, fields: 8, fieldSize: 2048 },
  fileFilter: (request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedAssignmentFiles[extension]
        || !allowedAssignmentFiles[extension].includes(file.mimetype)) {
      callback(new HttpError(400, 'File harus PDF, Word, PowerPoint, Excel, atau ZIP.'));
      return;
    }
    callback(null, true);
  }
}).single('file');

function receiveAssignmentUpload(request, response) {
  return new Promise((resolve, reject) => {
    assignmentUpload(request, response, error => {
      if (!error) {
        resolve(request.file || null);
        return;
      }
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        reject(new HttpError(413, 'Ukuran file tugas maksimal 10 MB.'));
        return;
      }
      if (error instanceof multer.MulterError) {
        reject(new HttpError(400, 'Form tugas tidak valid atau terlalu banyak file.'));
        return;
      }
      reject(error);
    });
  });
}

function validateAssignmentFields(data) {
  const course = typeof data.course === 'string' ? data.course.trim() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const semester = Number(data.semester || 5);
  const category = typeof data.category === 'string' ? data.category.trim() : 'Tugas';
  const status = typeof data.status === 'string' ? data.status.trim() : 'Dalam proses';
  const dueDate = typeof data.dueDate === 'string' ? data.dueDate.trim() : '';
  const externalUrl = typeof data.externalUrl === 'string' ? data.externalUrl.trim() : '';
  if (!course || course.length > 120 || !title || title.length > 160
      || !description || description.length > 1000
      || semester !== 5
      || !['Tugas', 'Praktikum', 'Proyek', 'Ujian', 'Catatan'].includes(category)
      || !['Dalam proses', 'Selesai'].includes(status)) {
    throw new HttpError(400, 'Data tugas tidak valid. Academic Hub hanya menerima tugas Semester 5.');
  }
  if (dueDate) {
    const parsedDueDate = new Date(`${dueDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
        || Number.isNaN(parsedDueDate.getTime())
        || parsedDueDate.toISOString().slice(0, 10) !== dueDate) {
      throw new HttpError(400, 'Tanggal pengumpulan tidak valid.');
    }
  }
  if (externalUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(externalUrl);
    } catch {
      throw new HttpError(400, 'Tautan tugas tidak valid.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || externalUrl.length > 2048) {
      throw new HttpError(400, 'Tautan tugas harus menggunakan HTTP atau HTTPS.');
    }
  }
  return {
    semester,
    course,
    category,
    title,
    description,
    dueDate: dueDate || null,
    status,
    externalUrl: externalUrl || null
  };
}

function publicAssignment(row) {
  const dueDate = row.due_date
    ? row.due_date instanceof Date
      ? `${row.due_date.getFullYear()}-${String(row.due_date.getMonth() + 1).padStart(2, '0')}-${String(row.due_date.getDate()).padStart(2, '0')}`
      : String(row.due_date).slice(0, 10)
    : null;
  return {
    id: row.id,
    semester: row.semester,
    course: row.course,
    category: row.category,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    fileSize: row.file_size,
    dueDate,
    status: row.status,
    externalUrl: row.external_url,
    createdAt: row.created_at,
    downloadUrl: row.stored_name ? `/api/assignments/${encodeURIComponent(row.id)}/file` : null
  };
}

async function loadAssignments() {
  const [rows] = await database.execute(
    'SELECT id, semester, course, category, title, description, due_date, status, external_url, stored_name, file_name, file_size, created_at FROM assignments WHERE semester = 5 ORDER BY course ASC, created_at DESC, title ASC'
  );
  return rows.map(publicAssignment);
}

async function initializeDatabase() {
  if (!databaseConfig.user || !databaseConfig.database
      || !Number.isInteger(databaseConfig.port) || databaseConfig.port < 1 || databaseConfig.port > 65535) {
    throw new Error('Atur DB_USER, DB_NAME, dan DB_PORT dengan konfigurasi MySQL yang valid.');
  }
  database = mysql.createPool(databaseConfig);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS assignments (
      id CHAR(36) NOT NULL PRIMARY KEY,
      semester TINYINT UNSIGNED NOT NULL DEFAULT 5,
      course VARCHAR(120) NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'Tugas',
      title VARCHAR(160) NOT NULL,
      description VARCHAR(1000) NOT NULL,
      due_date DATE NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Dalam proses',
      external_url VARCHAR(2048) NULL,
      file_name VARCHAR(255) NULL,
      stored_name VARCHAR(64) NULL,
      mime_type VARCHAR(127) NULL,
      file_size INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  const [columns] = await database.execute(
    'SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [databaseConfig.database, 'assignments']
  );
  const existingColumns = new Map(columns.map(column => [column.COLUMN_NAME, column.IS_NULLABLE]));
  const migrations = [
    ['semester', "TINYINT UNSIGNED NOT NULL DEFAULT 5"],
    ['category', "VARCHAR(60) NOT NULL DEFAULT 'Tugas'"],
    ['due_date', 'DATE NULL'],
    ['status', "VARCHAR(32) NOT NULL DEFAULT 'Dalam proses'"],
    ['external_url', 'VARCHAR(2048) NULL']
  ];
  for (const [name, definition] of migrations) {
    if (!existingColumns.has(name)) {
      await database.query(`ALTER TABLE assignments ADD COLUMN ${name} ${definition}`);
      existingColumns.set(name, 'YES');
    }
  }
  const fileColumns = [
    ['file_name', 'VARCHAR(255)'],
    ['stored_name', 'VARCHAR(64)'],
    ['mime_type', 'VARCHAR(127)'],
    ['file_size', 'INT UNSIGNED']
  ].filter(([name]) => existingColumns.get(name) === 'NO');
  if (fileColumns.length > 0) {
    const definitions = fileColumns
      .map(([name, type]) => `MODIFY COLUMN ${name} ${type} NULL`)
      .join(', ');
    await database.query(`ALTER TABLE assignments ${definitions}`);
  }
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(value));
}

function readJson(request, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new HttpError(413, 'Ukuran permintaan terlalu besar.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, 'Format JSON tidak valid.'));
      }
    });
    request.on('error', reject);
  });
}

function getSession(request) {
  const cookie = request.headers.cookie || '';
  const token = cookie.match(/(?:^|;\s*)portfolio_session=([a-f0-9]+)/)?.[1];
  if (!token) return null;
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  sessions.set(token, Date.now() + sessionLifetime);
  return token;
}

function requireSameOrigin(request) {
  const origin = request.headers.origin;
  if (origin && new URL(origin).host !== request.headers.host) {
    throw new HttpError(403, 'Permintaan lintas origin tidak diizinkan.');
  }
}

function requireAdmin(request) {
  const token = getSession(request);
  if (!token) throw new HttpError(401, 'Silakan masuk sebagai admin terlebih dahulu.');
  return token;
}

async function loadProjects() {
  try {
    const saved = JSON.parse(await fs.readFile(projectsFile, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('Daftar proyek harus berupa array.');
    return saved;
  } catch (error) {
    if (error.code === 'ENOENT') return defaultProjects.map(project => ({ ...project }));
    throw error;
  }
}

let saveQueue = Promise.resolve();
function saveProjects(projects) {
  const operation = saveQueue.then(async () => {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${projectsFile}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, projectsFile);
  });
  saveQueue = operation.catch(() => {});
  return operation;
}

function validateProject(data, existing = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'Data proyek tidak valid.');
  }
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const category = typeof data.category === 'string' ? data.category.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const rawPurpose = data.purpose === undefined ? existing.purpose ?? '' : data.purpose;
  const rawDocumentationUrl = data.documentationUrl === undefined
    ? existing.documentationUrl ?? ''
    : data.documentationUrl;
  const tags = data.tags;
  const image = data.image === undefined ? existing.image ?? null : data.image;
  const imagePositionX = data.imagePositionX ?? existing.imagePositionX ?? 50;
  const imagePositionY = data.imagePositionY ?? existing.imagePositionY ?? 50;

  if (typeof rawPurpose !== 'string' || rawPurpose.trim().length > 500) {
    throw new HttpError(400, 'Tujuan proyek tidak valid.');
  }
  if (typeof rawDocumentationUrl !== 'string') {
    throw new HttpError(400, 'Tautan dokumentasi tidak valid.');
  }
  const documentationUrl = rawDocumentationUrl.trim();
  if (documentationUrl) {
    let parsedDocumentationUrl;
    try {
      parsedDocumentationUrl = new URL(documentationUrl);
    } catch {
      throw new HttpError(400, 'Tautan dokumentasi tidak valid.');
    }
    if (!['http:', 'https:'].includes(parsedDocumentationUrl.protocol) || documentationUrl.length > 2048) {
      throw new HttpError(400, 'Tautan dokumentasi harus menggunakan HTTP atau HTTPS.');
    }
  }

  if (!title || title.length > 80 || !category || category.length > 40
      || !description || description.length > 300) {
    throw new HttpError(400, 'Nama, kategori, atau deskripsi proyek tidak valid.');
  }
  if (!Array.isArray(tags) || tags.length > 12
      || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) {
    throw new HttpError(400, 'Daftar tag proyek tidak valid.');
  }
  if (image !== null && (typeof image !== 'string'
      || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image)
      || Buffer.byteLength(image, 'utf8') > 1_400_000)) {
    throw new HttpError(400, 'Foto harus JPG, PNG, atau WebP dan maksimal 1 MB.');
  }
  if (!Number.isInteger(imagePositionX) || imagePositionX < 0 || imagePositionX > 100
      || !Number.isInteger(imagePositionY) || imagePositionY < 0 || imagePositionY > 100) {
    throw new HttpError(400, 'Posisi foto tidak valid.');
  }

  return {
    ...existing,
    title,
    category,
    description,
    purpose: rawPurpose.trim(),
    documentationUrl: documentationUrl || null,
    tags: tags.map(tag => tag.trim()),
    image,
    imagePositionX,
    imagePositionY
  };
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/projects') {
    sendJson(response, 200, await loadProjects());
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/session') {
    sendJson(response, 200, { authenticated: Boolean(getSession(request)) });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/login') {
    requireSameOrigin(request);
    const body = await readJson(request, 4096);
    const submittedPassword = body && typeof body.password === 'string' ? body.password : '';
    const submittedHash = crypto.createHash('sha256').update(submittedPassword).digest();
    const passwordHash = crypto.createHash('sha256').update(password).digest();
    if (!crypto.timingSafeEqual(submittedHash, passwordHash)) {
      throw new HttpError(401, 'Kata sandi admin salah.');
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + sessionLifetime);
    sendJson(response, 200, { authenticated: true }, {
      'Set-Cookie': `portfolio_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionLifetime / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/logout') {
    requireSameOrigin(request);
    const token = getSession(request);
    if (token) sessions.delete(token);
    sendJson(response, 200, { authenticated: false }, {
      'Set-Cookie': 'portfolio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/assignments') {
    sendJson(response, 200, await loadAssignments());
    return;
  }
  const downloadMatch = url.pathname.match(/^\/api\/assignments\/([a-f0-9-]{36})\/file$/);
  if (request.method === 'GET' && downloadMatch) {
    const [rows] = await database.execute(
      'SELECT stored_name, file_name, mime_type, file_size FROM assignments WHERE id = ?',
      [downloadMatch[1]]
    );
    if (rows.length === 0) throw new HttpError(404, 'File tugas tidak ditemukan.');
    const assignment = rows[0];
    if (!assignment.stored_name) throw new HttpError(404, 'Tugas ini tidak memiliki file yang diunggah.');
    if (!/^[a-f0-9-]{36}\.(?:pdf|docx?|pptx?|xlsx?|zip)$/.test(assignment.stored_name)) {
      throw new Error('Nama file tugas di database tidak valid.');
    }
    const filePath = path.join(assignmentDirectory, assignment.stored_name);
    try {
      await fs.stat(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'File tugas tidak ditemukan di server.');
      throw error;
    }
    const fallbackName = assignment.file_name.replace(/[^\x20-\x7E]|["\\;]/g, '_');
    const encodedName = encodeURIComponent(assignment.file_name).replace(/[!'()*]/g, character =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    response.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': assignment.file_size,
      'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    const stream = fsSync.createReadStream(filePath);
    stream.on('error', error => {
      if (!response.headersSent) sendJson(response, 404, { error: 'File tugas tidak ditemukan di server.' });
      else response.destroy(error);
    });
    stream.pipe(response);
    return;
  }

  if (!url.pathname.startsWith('/api/')) return false;
  requireSameOrigin(request);
  requireAdmin(request);

  if (url.pathname === '/api/assignments' && request.method === 'POST') {
    let uploadedFile;
    try {
      uploadedFile = await receiveAssignmentUpload(request, response);
      const fields = validateAssignmentFields(request.body || {});
      if (!uploadedFile && !fields.externalUrl) {
        throw new HttpError(400, 'Lampirkan file atau tautan tugas.');
      }
      if (uploadedFile && uploadedFile.size === 0) throw new HttpError(400, 'File tugas tidak boleh kosong.');
      const id = crypto.randomUUID();
      await database.execute(
        'INSERT INTO assignments (id, semester, course, category, title, description, due_date, status, external_url, file_name, stored_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          fields.semester,
          fields.course,
          fields.category,
          fields.title,
          fields.description,
          fields.dueDate,
          fields.status,
          fields.externalUrl,
          uploadedFile ? path.basename(uploadedFile.originalname.replace(/\\/g, '/')).slice(0, 255) : null,
          uploadedFile ? uploadedFile.filename : null,
          uploadedFile ? uploadedFile.mimetype : null,
          uploadedFile ? uploadedFile.size : null
        ]
      );
    } catch (error) {
      if (uploadedFile) await fs.unlink(uploadedFile.path).catch(unlinkError => {
        if (unlinkError.code !== 'ENOENT') console.error(unlinkError);
      });
      throw error;
    }
    sendJson(response, 201, await loadAssignments());
    return;
  }

  const assignmentMatch = url.pathname.match(/^\/api\/assignments\/([a-f0-9-]{36})$/);
  if (assignmentMatch && (request.method === 'PUT' || request.method === 'DELETE')) {
    const id = assignmentMatch[1];
    const [rows] = await database.execute(
      'SELECT stored_name, external_url FROM assignments WHERE id = ?',
      [id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Tugas tidak ditemukan.');
    const existing = rows[0];
    if (request.method === 'DELETE') {
      await database.execute('DELETE FROM assignments WHERE id = ?', [id]);
      if (existing.stored_name) {
        await fs.unlink(path.join(assignmentDirectory, existing.stored_name)).catch(error => {
          if (error.code !== 'ENOENT') throw error;
        });
      }
      sendJson(response, 200, await loadAssignments());
      return;
    }

    let uploadedFile;
    try {
      uploadedFile = await receiveAssignmentUpload(request, response);
      const fields = validateAssignmentFields(request.body || {});
      if (!uploadedFile && !fields.externalUrl && !existing.stored_name) {
        throw new HttpError(400, 'Lampirkan file atau tautan tugas.');
      }
      if (uploadedFile && uploadedFile.size === 0) throw new HttpError(400, 'File tugas tidak boleh kosong.');
      if (uploadedFile) {
        await database.execute(
          'UPDATE assignments SET semester = ?, course = ?, category = ?, title = ?, description = ?, due_date = ?, status = ?, external_url = ?, file_name = ?, stored_name = ?, mime_type = ?, file_size = ? WHERE id = ?',
          [
            fields.semester,
            fields.course,
            fields.category,
            fields.title,
            fields.description,
            fields.dueDate,
            fields.status,
            fields.externalUrl,
            path.basename(uploadedFile.originalname.replace(/\\/g, '/')).slice(0, 255),
            uploadedFile.filename,
            uploadedFile.mimetype,
            uploadedFile.size,
            id
          ]
        );
        if (existing.stored_name) {
          await fs.unlink(path.join(assignmentDirectory, existing.stored_name)).catch(error => {
            if (error.code !== 'ENOENT') console.error(error);
          });
        }
      } else {
        await database.execute(
          'UPDATE assignments SET semester = ?, course = ?, category = ?, title = ?, description = ?, due_date = ?, status = ?, external_url = ? WHERE id = ?',
          [
            fields.semester,
            fields.course,
            fields.category,
            fields.title,
            fields.description,
            fields.dueDate,
            fields.status,
            fields.externalUrl,
            id
          ]
        );
      }
    } catch (error) {
      if (uploadedFile) await fs.unlink(uploadedFile.path).catch(unlinkError => {
        if (unlinkError.code !== 'ENOENT') console.error(unlinkError);
      });
      throw error;
    }
    sendJson(response, 200, await loadAssignments());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/projects') {
    const body = await readJson(request);
    const project = {
      ...validateProject(body),
      id: crypto.randomUUID(),
      status: 'Proyek pribadi',
      templateIndex: null
    };
    const projects = [...await loadProjects(), project];
    await saveProjects(projects);
    sendJson(response, 201, projects);
    return;
  }

  const match = url.pathname.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)$/);
  if (match && (request.method === 'PUT' || request.method === 'DELETE')) {
    const id = match[1];
    const projects = await loadProjects();
    const index = projects.findIndex(project => project.id === id);
    if (index < 0) throw new HttpError(404, 'Proyek tidak ditemukan.');
    if (request.method === 'DELETE') {
      projects.splice(index, 1);
    } else {
      const body = await readJson(request);
      projects[index] = validateProject(body, projects[index]);
    }
    await saveProjects(projects);
    sendJson(response, 200, projects);
    return;
  }

  throw new HttpError(404, 'Endpoint tidak ditemukan.');
}

function contentType(filePath) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  })[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveStatic(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'Alamat halaman tidak valid.');
  }
  const relativePath = path.normalize(decodedPath === '/' ? 'index.html' : decodedPath.slice(1));
  const isImageAsset = relativePath.startsWith(`images${path.sep}`)
    && relativePath.split(path.sep).every(segment => segment && segment !== '..' && !segment.startsWith('.'));
  if (!['index.html', 'script.js', 'style.css'].includes(relativePath) && !isImageAsset) {
    throw new HttpError(404, 'Halaman tidak ditemukan.');
  }
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new HttpError(404, 'Halaman tidak ditemukan.');

  let content;
  try {
    content = await fs.readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      throw new HttpError(404, 'Halaman tidak ditemukan.');
    }
    throw error;
  }
  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

async function start() {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Set PORTFOLIO_ADMIN_PASSWORD dengan kata sandi minimal 12 karakter.');
  }
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.mkdir(assignmentDirectory, { recursive: true });
  await initializeDatabase();
  try {
    await fs.access(projectsFile);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await saveProjects(defaultProjects);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT harus berupa angka antara 1 dan 65535.');
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        await handleApi(request, response, url);
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        throw new HttpError(405, 'Metode HTTP tidak diizinkan.');
      }
      await serveStatic(request, response, url.pathname);
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: status === 500 ? 'Terjadi kesalahan pada server.' : error.message
      });
    }
  });

  server.listen(port, host, () => {
    console.log(`Portofolio berjalan di http://${host}:${port}`);
  });
}

start().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
