const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'notari_jwt_secret_dev_key_2026';

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please log in as an administrator.'
    });
  }

  const token = authHeader.split(' ')[1];

   try {
     const decoded = jwt.verify(token, JWT_SECRET);
     req.admin = decoded;
     next();
   } catch (err) {
     return res.status(403).json({
       error: 'Session expired or invalid token. Please log in again.'
     });
   }
 }

function requireSuperAdmin(req, res, next) {
   if (req.admin.role !== 'superadmin') {
     return res.status(403).json({
       error: 'Superadmin access required for this action.'
     });
   }
   next();
 }

module.exports = requireAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;
