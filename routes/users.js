const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { requireLogin, checkRole } = require('../middleware/auth')


router.get('/me', requireLogin, (req, res) => {
    res.json(req.session.user);
    });

// إضافة Agent
router.post('/add-agent', requireLogin, checkRole(['super_admin']), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'agent', $3)",
            [name, phone, hashedPassword]
        );
        res.json({ "message": "Agent added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Supervisor
router.post('/add-supervisor', requireLogin, checkRole(['super_admin']), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'supervisor', $3)",
            [name, phone, hashedPassword]
        );
        res.json({ message: 'Supervisor added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Super Admin (إذا احتجت لاحقًا)
router.post('/add-super-admin',requireLogin, checkRole(['super_admin']), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'super_admin', $3)",
            [name, phone, hashedPassword]
        );
        res.json({ message: 'Super Admin added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// إضافة Admin
router.post('/add-admin', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'admin', $3)",
      [name, phone, hashedPassword]
    );
    res.json({ message: 'Admin added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// عرض جميع المستخدمين
router.get('/', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, phone, role FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// تعديل مستخدم
router.put('/:id', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    const { name, phone, role } = req.body;
    await db.query("UPDATE users SET name=$1, phone=$2, role=$3 WHERE id=$4",
      [name, phone, role, req.params.id]);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// حذف مستخدم
router.delete('/:id', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//login
router.post('/login', async (req, res) => {
  console.log("==Login route hit==");
    const { name, password } = req.body;
    console.log("Name from input:", name);
    console.log("Passsword from input:", password);
    
    try {
        const result = await db.query("SELECT * FROM users WHERE name = $1", [name]);
        console.log("DB result:",result.rows);
        if (result.rows.length === 0) {
        console.log("No user found with this name");    
        return res.status(401).json({ message: 'Invalid credentials' });
    }

        const user = result.rows[0];
        console.log("User from DB:", user); 
        const match = await bcrypt.compare(password, user.password);
        console.log("Password match result:", match);
      
        if (!match){
            console.log("Password did not match for user:", user.name);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        req.session.user = { id: user.id, name: user.name, role: user.role };
         console.log("Login successful for:", user.name);
        console.log("Session after login:", req.session);
    res.json({message: 'Login successful', user: { id:user.id, name: user.name, role: user.role }});
    
    } catch (err) {
        console.error(err);
 res.status(500).json ({ message: 'Server error' });
    }
});


module.exports = router;

























