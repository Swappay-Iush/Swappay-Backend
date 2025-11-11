// Middleware para verificar si el usuario es administrador
module.exports = function isAdmin(req, res, next) {
  // El usuario debe estar autenticado y tener el rol 'admin'
  // Se asume que el usuario está en req.user (debe haber un middleware previo que decodifique el JWT)
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo administradores.' });
  }
  next();
}
