const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Collection } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const admins = new Collection('admins');

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = admins.findAll().find(a => a.email === email.toLowerCase());
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/verify', auth, (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
