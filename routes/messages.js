
const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { sendMessageToNumber } = require('../whatsappClient.js');

// جلب كل الرسائل لعميل معين
router.get('/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const userId = req.session$1.user$2.id;
   
    if (!userId) {
        return 
    res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        const clientCheck = await db.query(
            `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
            [clientId, userId]);
        if (clientCheck.rows.length === 0)
{
        
        return 
    res.status(403).json({ message: 'Forbidden' });
    }
        
        
        const result = await db.query(
            `SELECT * FROM messages 
             WHERE client_id = $1 
             ORDER BY created_at ASC`,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إرسال رسالة جديدة
router.post('/send', async (req, res) => {
    const { clientId, senderRole, content, to } = req.body;
    try {
        await sendMessageToNumber(clientId, to, content });
        const result = await db.query(
            `INSERT INTO messages (client_id, sender_role, content)
             VALUES ($1, $2, $3) RETURNING *`,
            [clientId, senderRole, content]
        );
        res.json({ message: 'Message sent', data: result.rows[0] });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// حذف رسالة (تعليمها كمحذوفة لكن تبقى للعرض)
router.post('/delete', async (req, res) => {
    const { messageId } = req.body;
    try {
        const result = await db.query(
            `UPDATE messages SET is_deleted = TRUE 
             WHERE id = $1 RETURNING *`,
            [messageId]
        );
        res.json({ message: 'Message marked as deleted', data: result.rows[0] });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
