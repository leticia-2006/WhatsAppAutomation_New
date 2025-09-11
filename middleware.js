function requireLogin(req, res, next) {
    if (!req.session || !req.session.user)
    { return res.status(401).json({ message: 'Login required' });
    next();
}

function checkRole(allowedRoles) {
    return (req, res, next) => {
        const userRole= req.session.user.role;
        if (userRole === 'super_admin') {
            return  next();
        }
        if (allowedRoles.inculdes(userRole)) {
                return next();
            }
        return
res.status(403).json({ message: 'Access denied' });
    };
}

module.exports = { requireLogin, checkRole };
