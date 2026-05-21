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

function requireAuth(req, res) {
  const auth = verifyAuth(req);
  if (!auth.valid) {
    res.status(401).json({ error: auth.error });
    return null;
  }
  return auth.user;
}

module.exports = { verifyAuth, requireAuth };
