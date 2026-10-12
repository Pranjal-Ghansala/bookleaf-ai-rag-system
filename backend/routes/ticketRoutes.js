import express from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { classifyAndPrioritizeTicket, generateDraftResponse } from '../services/geminiService.js';

const router = express.Router();
const categories = ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
const publicTicket = (ticket) => {
  const obj = ticket.toObject ? ticket.toObject() : { ...ticket };
  delete obj.internalNotes;
  return obj;
};

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const query = req.user.role === 'author' ? { authorId: req.user.id } : {};
    if (req.user.role === 'admin') {
      const { status, category, priority, from, to } = req.query;
      if (status) { if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' }); query.status = status; }
      if (category) { if (!categories.includes(category)) return res.status(400).json({ error: 'Invalid category filter.' }); query.category = category; }
      if (priority) { if (!priorities.includes(priority)) return res.status(400).json({ error: 'Invalid priority filter.' }); query.priority = priority; }
      if (from || to) {
        query.createdAt = {};
        if (from && !Number.isNaN(Date.parse(from))) query.createdAt.$gte = new Date(from); else if (from) return res.status(400).json({ error: 'Invalid from date.' });
        if (to && !Number.isNaN(Date.parse(to))) query.createdAt.$lte = new Date(to); else if (to) return res.status(400).json({ error: 'Invalid to date.' });
      }
    }
    const cursor = Ticket.find(query).populate('authorId', 'name email').populate('bookId', 'title isbn');
    let tickets = await (req.user.role === 'admin' ? cursor.sort({ createdAt: 1 }) : cursor.sort({ createdAt: -1 }));
    if (req.user.role === 'admin') {
      const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      tickets = tickets.sort((a, b) => {
        const aResolved = ['Resolved', 'Closed'].includes(a.status) ? 1 : 0;
        const bResolved = ['Resolved', 'Closed'].includes(b.status) ? 1 : 0;
        return aResolved - bResolved || rank[a.priority] - rank[b.priority] || new Date(a.createdAt) - new Date(b.createdAt);
      });
    }
    res.json(req.user.role === 'author' ? tickets.map(publicTicket) : tickets);
  } catch (err) { next(err); }
});

router.post('/', verifyToken, requireRole(['author']), async (req, res, next) => {
  try {
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const bookId = req.body.bookId || null;
    if (subject.length < 3 || subject.length > 160 || description.length < 10 || description.length > 10000) {
      return res.status(400).json({ error: 'Subject must be 3–160 characters and description 10–10,000 characters.' });
    }
    if (bookId) {
      if (!mongoose.isValidObjectId(bookId)) return res.status(400).json({ error: 'Invalid book selection.' });
      const ownedBook = await Book.findOne({ _id: bookId, authorId: req.user.id });
      if (!ownedBook) return res.status(403).json({ error: 'You can only raise tickets for your own books.' });
    }
    // Classification service has a safe fallback so ticket creation still succeeds when AI is unavailable.
    const aiAnalysis = await classifyAndPrioritizeTicket(subject, description);
    const ticket = await Ticket.create({ authorId: req.user.id, bookId, subject, description,
      category: categories.includes(aiAnalysis.category) ? aiAnalysis.category : 'General Inquiry',
      priority: priorities.includes(aiAnalysis.priority) ? aiAnalysis.priority : 'Medium', status: 'Open' });
    res.status(201).json(publicTicket(ticket));
  } catch (err) { next(err); }
});

router.get('/:id/ai-draft', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket ID.' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const [author, book] = await Promise.all([User.findById(ticket.authorId), ticket.bookId ? Book.findById(ticket.bookId) : null]);
    res.json({ draft: await generateDraftResponse(ticket, author, book) });
  } catch (err) { next(err); }
});

router.patch('/:id', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket ID.' });
    const { status, priority, category, assignToMe } = req.body;
    const updateData = {};
    if (status !== undefined) { if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' }); updateData.status = status; }
    if (priority !== undefined) { if (!priorities.includes(priority)) return res.status(400).json({ error: 'Invalid priority.' }); updateData.priority = priority; }
    if (category !== undefined) { if (!categories.includes(category)) return res.status(400).json({ error: 'Invalid category.' }); updateData.category = category; }
    if (assignToMe === true) updateData.assignedAdminId = req.user.id;
    if (!Object.keys(updateData).length) return res.status(400).json({ error: 'No valid ticket updates provided.' });
    
    // Updated from { new: true } to { returnDocument: 'after' }
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true }).populate('authorId', 'name email').populate('bookId', 'title isbn').populate('assignedAdminId', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json(ticket);
  } catch (err) { next(err); }
});

router.post('/:id/messages', verifyToken, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket ID.' });
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 10000) return res.status(400).json({ error: 'Message is required and must be at most 10,000 characters.' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (req.user.role === 'author' && ticket.authorId.toString() !== req.user.id) return res.status(403).json({ error: 'Access forbidden.' });
    const sender = req.user.role === 'admin' ? 'admin' : 'author';
    ticket.messages.push({ sender, content });
    if (sender === 'admin' && ticket.status === 'Open') ticket.status = 'In Progress';
    await ticket.save();
    const populated = await Ticket.findById(ticket._id).populate('authorId', 'name email').populate('bookId', 'title isbn');
    res.json(req.user.role === 'author' ? publicTicket(populated) : populated);
  } catch (err) { next(err); }
});

router.post('/:id/notes', verifyToken, requireRole(['admin']), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket ID.' });
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!note || note.length > 5000) return res.status(400).json({ error: 'Note is required and must be at most 5,000 characters.' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    ticket.internalNotes.push({ adminId: req.user.id, note });
    await ticket.save();
    res.json(ticket);
  } catch (err) { next(err); }
});

export default router;