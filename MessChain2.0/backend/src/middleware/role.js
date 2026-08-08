/**
 * Role-based access control middleware factory.
 * Usage: checkRole('ADMIN') or checkRole('STUDENT', 'ADMIN')
 */
function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = checkRole;
