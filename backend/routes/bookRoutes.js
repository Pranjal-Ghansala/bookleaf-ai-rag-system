import express from 'express';
import Book from '../models/Book.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const books = req.user.role === 'admin' 
      ? await Book.find().populate('authorId', 'name email')
      : await Book.find({ authorId: req.user.id });
    res.json(books);
  } catch (err) {
    next(err);
  }
});

export default router;