const jwt = require('jsonwebtoken');

function verifyAuth(req) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: 'Invalid token' };
  }
}

function requireAuth(req, res, next) {
  const auth = verifyAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }
  req.user = auth.user;
  next();
}

module.exports = { verifyAuth, requireAuth };
