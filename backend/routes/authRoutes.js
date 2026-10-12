import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters.' });
    }
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered.' });
    const hashedPassword = await bcrypt.hash(password, 12);
    // Public registration is author-only; admin accounts must be provisioned privately.
    await User.create({ name, email, password: hashedPassword, role: 'author' });
    res.status(201).json({ message: 'Author registered successfully.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered.' });
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Authentication is not configured on this server.' });
    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

export default router;
