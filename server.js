const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const session = require('express-session'); // لإدارة الجلسات
const bcrypt = require('bcrypt'); // لتشفير الباسورد
const messagesRouter = require('./routes/messages')
const db = require('./db.js');
const sessionsRouter = require('./routes/sessions');
const app = express();
const usersRouter = require('./routes/users');
                            

// Middleware
app.use(cors({
  origin: "https://chat.ohgo.site",
  credentials: true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'wa_automation_secret', // يمكن تغييره
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000, 
           secure: process.env.NODE_ENV ==='production',
          sameSite: 'none'
          } // 2 ساعات
}));

app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy","default-src * 'unsafe-inline' 'unsafe-eval'");
    next();
});

// ===== Middleware للتحقق من تسجيل الدخول =====
function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
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

// ===== Frontend =====
const FRONTEND_PATH = path.join(__dirname,'frontend');
app.use(express.static(FRONTEND_PATH));
app.get('*', (req, res) => { res.sendFile(path.join(FRONTEND_PATH,'index.html')); });

const PORT = process.env.PORT || 5008;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = server;








