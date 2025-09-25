const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
// كل العملاء  
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT is_deleted FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS is_deleted,
        (SELECT COUNT(*) FROM clients cc WHERE cc.phone = c.phone) > 1 AS is_repeat,
        (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count
      FROM clients c
      ORDER BY c.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// عرض عميل محدد
router.get('/:client_id', async (req, res) => {
  try {
    const clientId = req.params.client_id;
    const result = await db.query(`
      SELECT 
        c.*,
        (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT is_deleted FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS is_deleted,
        (SELECT COUNT(*) FROM clients cc WHERE cc.phone = c.phone) > 1 AS is_repeat
      FROM clients c
      WHERE c.id = $1
    `, [clientId]);

    const notes = await db.query(
      "SELECT * FROM notes WHERE client_id=$1 ORDER BY created_at DESC",
      [clientId]
    );

    res.json({ ...result.rows[0], notes: notes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:client_id/notes', async (req, res) => {
  try {
    const { note } = req.body;
    const clientId = req.params.client_id;

    await db.query(
      "INSERT INTO notes (client_id, note, created_at) VALUES ($1, $2, NOW())",
      [clientId, note]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ error: "Failed to save note" });
  }
});

module.exports = router;







