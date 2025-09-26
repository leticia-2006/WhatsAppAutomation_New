const db = require('../db');
exports.requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      console.log("Session lost.Cookies:", req.headers.cookie);
      console.log("Current session object:", req.session);
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};

// لو تحب تضيف user كامل بدل بس req.session.user
exports.attachUser = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const result = await db.query("SELECT * FROM users WHERE id=$1", [req.session.userId]);
      req.user = result.rows[0];
    } catch (err) {
      console.error("❌ DB error while attaching user:", err);
    }
  }
  next();
};
