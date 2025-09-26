const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const session = require('express-session'); // لإدارة الجلسات
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db.js');
const bcrypt = require('bcrypt'); // لتشفير الباسورد
const messagesRouter = require('./routes/messages')
const sessionsRouter = require('./routes/sessions');
const usersRouter = require('./routes/users');
const waNumbersRouter = require('./routes/waNumbers');                            
const { reconnectAllActive, getQRForNumber } = require('./waClient')
const { requireLogin, checkRole } = require('./middleware/auth.js');
const multer = require('multer');
const app = express();
const upload = multer({ dest: 
 path.join(__dirname, 'uploads') });

console.log("Server file started running...");

// Middleware
app.use(cors({
  origin: "https://whatsappautomation-new-4fec.onrender.com",
  credentials: true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({
 
 store: new pgSession({
  pool: pool,
  tableName: 'session'
 }),
 secret: process.env.SESSION_SECRET || 'wa_automation_secret', // يمكن تغييره
 resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000, 
           httpOnly: true,
           secure: true,
          sameSite: "none"
          } // 2 ساعات
}));

// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://whatsappautomation-new-4fec.onrender.com wss:; " +
    "frame-src 'self';"
  );
console.log("Cookies from client:", req.headers.cookie);
    next();
});

// Debug incoming requests
app.use((req, res, next) => {
 console.log(`Incoming request: ${req.method} ${req.url}`);
 next();
});

//Upload route
app.post('/upload', upload.single('file'), (req, res) => {
 res.json({ file: req.file }); });

// ===== Routes تطبيقية =====
app.use('/sessions', requireLogin, sessionsRouter);
app.use('/users', usersRouter);
app.use('/messages', requireLogin, messagesRouter);
app.use('/wa-numbers', requireLogin,waNumbersRouter);

// ===== Frontend =====
const FRONTEND_PATH = path.join(__dirname,'frontend');
app.use(express.static(FRONTEND_PATH));
app.get('/dashboard.html', requireLogin, (req, res) => { res.sendFile(path.join(FRONTEND_PATH,'dashboard.html')); });
app.get(/^\/(?!api|wa-numbers).*/, (req, res) => { res.sendFile(path.join(FRONTEND_PATH, 'index.html'));});


// QR
app.get("/wa-numbers/:numberId/qr", (req, res) => {
  const { numberId } = req.params;
  const qr = getQRForNumber(numberId);
  if (qr) {
    res.json({ qr });
  } else {
    res.status(404).json({ error: "QR not found or already scanned" });
  }
});


// Error handler لتشخيص المشاكل
app.use((err, req, res, next) => {
  console.error("Error caught:", err);
  res.status(500).send("Internal Server Error");
});

// ====== Server =====
const PORT = process.env.PORT || 5008;
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
reconnectAllActive().then(() => {
  console.log("✅ تم إعادة تشغيل جميع الأرقام النشطة");
});process.on("uncaughtException", (err) => {
 console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
console.error("Unhandled Rejection:", reason);
});
module.exports = server;








































