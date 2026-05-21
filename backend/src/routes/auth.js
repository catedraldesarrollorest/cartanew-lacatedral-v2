const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  if (pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const token = jwt.sign(
    { authenticated: true, timestamp: new Date().toISOString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, expiresIn: '8h' });
});

module.exports = router;
