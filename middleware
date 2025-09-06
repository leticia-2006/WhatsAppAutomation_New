function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ message: 'Login required' });
    next();
}

function checkRole(role) {
    return (req, res, next) => {
        if (req.session.user.role === role || req.session.user.role === 'super_admin') next();
        else res.status(403).json({ message: 'Access denied' });
    };
}

module.exports = { requireLogin, checkRole };
