const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '-hc(m5dSUH2t^',
    database: 'whatsapp_automation',
});

module.exports = db;

