const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Collection } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const admins = new Collection('admins');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const admin = admins.findAll().find(a => a.email === email.toLowerCase().trim());

    // Anti timing-attack: always hash even if user not found
    if (!admin) {
      await bcrypt.hash(password, 12); // constant time regardless of user existence
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Short-lived token (8 hours instead of 24)
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/verify', auth, (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
