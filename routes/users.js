const express = require('express');
const router = express.Router();
const db = require('../db.js'); // استدعاء قاعدة البيانات

// Middleware لفحص الصلاحيات
function checkRole(requiredRole) {    
  return (req, res, next) => {    
    const userRole = req.user.role; // نفترض أن المستخدم مسجل دخول    
    if (userRole === requiredRole || userRole === 'super_admin') {    
      next();    
    } else {    
      res.status(403).json({ message: 'Access denied' });    
    }    
  };    
}

// مثال على Route محمي لإضافة Agent
router.post('/add-agent', checkRole('super_admin'), async (req, res) => {    
  try {
    const { name, phone } = req.body;
    await db.query("INSERT INTO users (name, phone, role) VALUES (?, ?, 'agent')", [name, phone]);
    res.json({ message: 'Agent added successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
