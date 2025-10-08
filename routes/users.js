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
    const { name, phone, role, password } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET name=$1, phone=$2, role=$3, password=$4 WHERE id=$5",
      [name, phone, role, hashedPassword,req.params.id]);
    } else {
      await db.query("UPDATE users SET name=$1, phone=$2, role=$3 WHERE id=$4",
        [name, phone, role, req.params.id]);
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error("❌ Error updating user:", err);
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

// مثال: راوت يعيد الجلسات الخاصة بـ agent
router.get('/sessions/agent/:id', requireLogin, checkRole(['agent', 'admin', 'super_admin', 'supervisor']), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM sessions WHERE assigned_agent_id = $1 ORDER BY updated_at DESC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// عرض جميع الجلسات (لـ admin, supervisor, super_admin)
router.get('/sessions', requireLogin, checkRole(['admin','super_admin','supervisor']), async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM sessions ORDER BY updated_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ راوت للحصول على بيانات مستخدم محدد (فقط super_admin)
router.get('/:id', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await db.query('SELECT id, name, role, created_at FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching user by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
  const user = result.rows[0];
  if (user.role === 'supervisor') {
    const perms = await db.query('SELECT * FROM supervisor_permissions WHERE supervisor_id=$1', [req.params.id]);
    user.permissions = perms.rows[0] || {};
  }
  res.json(user);
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
        const match = (password === user.password);
        console.log("Password match result:", match);
      
        if (!match){
            console.log("Password did not match for user:", user.name);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // supervisor نحضر صلاحيات المشرف إذا كان الدور
        let permissions = {};
        if (user.role === "supervisor") {
      const permResult = await db.query(
        "SELECT can_manage_users, can_manage_numbers FROM supervisor_permissions WHERE supervisor_id = $1",
        [user.id]
       );
         if (permResult.rows.length > 0) {
          permissions = permResult.rows[0];
       }
     }
        req.session.user = { id: user.id, name: user.name, role: user.role, permissions };
        req.session.userId = user.id;
         console.log("Login successful for:", user.name);
        console.log("Session after login:", req.session);
    res.json({message: 'Login successful', user: { id:user.id, name: user.name, role: user.role, permissions }});
    
    } catch (err) {
        console.error(err);
 res.status(500).json ({ message: 'Server error' });
    }
});

// تحديث صلاحيات Supervisor
router.put('/permissions/:id', requireLogin, checkRole(['super_admin']), async (req, res) => {
  try {
    const { can_manage_users, can_manage_numbers } = req.body;

    // هل للمشرف صلاحيات موجودة مسبقاً؟
    const check = await db.query(
      "SELECT * FROM supervisor_permissions WHERE supervisor_id=$1",
      [req.params.id]
    );

    if (check.rows.length > 0) {
      // تحديث الصلاحيات
      await db.query(
        "UPDATE supervisor_permissions SET can_manage_users=$1, can_manage_numbers=$2 WHERE supervisor_id=$3",
        [can_manage_users, can_manage_numbers, req.params.id]
      );
    } else {
      // إدخال أول مرة
      await db.query(
        "INSERT INTO supervisor_permissions (supervisor_id, can_manage_users, can_manage_numbers) VALUES ($1, $2, $3)",
        [req.params.id, can_manage_users, can_manage_numbers]
      );
    }

    res.json({ message: 'Supervisor permissions updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;












































