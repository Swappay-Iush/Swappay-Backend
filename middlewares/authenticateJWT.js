// Middleware para autenticar y decodificar el JWT
const jwt = require('jsonwebtoken');

module.exports = function authenticateJWT(req, res, next) {
  const token = req.cookies?.access_token || req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_JWT_SWAP);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}
