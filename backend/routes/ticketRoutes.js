import express from 'express';
import Ticket from '../models/Ticket.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { classifyAndPrioritizeTicket, generateDraftResponse } from '../services/geminiService.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = req.user.role === 'author' ? { authorId: req.user.id } : {};
    if (req.user.role === 'admin') {
      const { status, category, priority } = req.query;
      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;
    }
    const tickets = await Ticket.find(query)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

router.post('/', verifyToken, requireRole(['author']), async (req, res, next) => {
  try {
    const { bookId, subject, description } = req.body;
    const aiAnalysis = await classifyAndPrioritizeTicket(subject, description);
    const ticket = new Ticket({
      authorId: req.user.id,
      bookId: bookId || null,
      subject,
      description,
      category: aiAnalysis.category || 'General Inquiry',
      priority: aiAnalysis.priority || 'Medium',
      status: 'Open'
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/ai-draft', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const author = await User.findById(ticket.authorId);
    const book = ticket.bookId ? await Book.findById(ticket.bookId) : null;
    const draft = await generateDraftResponse(ticket, author, book);
    res.json({ draft });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { status, priority, category } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/messages', verifyToken, async (req, res, next) => {
  try {
    const { content } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (req.user.role === 'author' && ticket.authorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }

    const sender = req.user.role === 'admin' ? 'admin' : 'author';
    ticket.messages.push({ sender, content });
    if (sender === 'admin' && ticket.status === 'Open') ticket.status = 'In Progress';
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/notes', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { note } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    ticket.internalNotes.push({ adminId: req.user.id, note });
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

export default router;