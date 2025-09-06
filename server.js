const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const session = require('express-session'); // لإدارة الجلسات
const bcrypt = require('bcrypt'); // لتشفير الباسورد
const messagesRouter = require('./routes/messages')
const db = require('./db.js');

const app = express();

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
  cookie: { maxAge: 2 * 60 * 60 * 1000 } // 2 ساعات
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

// ===== Routes تسجيل الدخول والخروج =====
app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE phone=$1', [phone]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Incorrect password' });

        req.session.user = { id: user.id, name: user.name, role: user.role };
        res.json({ message: 'Login successful', user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/logout', requireLogin, (req, res) => {
    req.session.destroy(err => {
        if(err) return res.status(500).json({ message: 'Logout failed' });
        res.json({ message: 'Logged out successfully' });
    });
});

// ===== Routes تطبيقية =====
const sessionsRouter = require('./routes/sessions');
const usersRouter = require('./routes/users');

app.use('/sessions', requireLogin, sessionsRouter);
app.use('/users', usersRouter);
app.use('/messages', messagesRouter);

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




