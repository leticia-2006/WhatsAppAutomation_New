 const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const session = require('express-session'); // لإدارة الجلسات
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // لتشفير الباسورد
const messagesRouter = require('./routes/messages')
const db = require('./db.js');
const sessionsRouter = require('./routes/sessions');
const app = express();
const usersRouter = require('./routes/users');
const waNumbersRouter = require('./routes/waNumbers');                            
const { connectWA } = require('./waClient')

console.log("Server file started running...");
// Middleware
app.use(cors({
  origin: "https://chat.ohgo.site",
  credentials: true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
const pool = new Pool({
 connectionString:
  process.env.DATABASE_URL,
 ssl: { rejectUnauthorized: false }});
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

app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy","default-src * 'unsafe-inline' 'unsafe-eval'");
 console.log("Cookies from client:", req.headers.cookie);
    next();
});

app.use((req, res, next) => {
 console.log(`Incoming request: ${req.method} ${req.url}`);
 next();
});
// ===== Middleware للتحقق من تسجيل الدخول =====
function requireLogin(req, res, next) {
    if (!req.session.user) { return res.redirect('/');}
    next();
}

function checkRole(role) {
    return (req, res, next) => {
        if (req.session.user.role === role || req.session.user.role === 'super_admin') next();
        else res.status(403).json({ message: 'Access denied' });
    }
}

// ===== Routes تطبيقية =====
app.use('/sessions', requireLogin, sessionsRouter);
app.use('/users', usersRouter);
app.use('/messages', requireLogin, messagesRouter);
app.use('/wa-numbers', requireLogin,waNumbersRouter);

// ===== Frontend =====
const FRONTEND_PATH = path.join(__dirname,'frontend');
app.use(express.static(FRONTEND_PATH));
app.get('/dashboard.html', requireLogin, (req, res) => { res.sendFile(path.join(FRONTEND_PATH,'dashboard.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(FRONTEND_PATH, 'index.html'));});

const PORT = process.env.PORT || 5008;
const server = http.createServer(app);

// Error handler لتشخيص المشاكل
app.use((err, req, res, next) => {
  console.error("Error caught:", err);
  res.status(500).send("Internal Server Error: " + err.message);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

process.on("uncaughtException", (err) => {
 console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
console.error("Unhandled Rejection:", reason);
});
module.exports = server;


























