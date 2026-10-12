import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Ticket from '../models/Ticket.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookleaf-support';
const here = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(here, '../data/bookleaf_sample_data.json');

const seedDatabase = async () => {
  try {
    const raw = JSON.parse(await readFile(datasetPath, 'utf8'));
    if (!Array.isArray(raw.authors) || raw.authors.length !== 10 || raw.authors.reduce((n, a) => n + (a.books?.length || 0), 0) !== 18) {
      throw new Error('Official dataset must contain exactly 10 authors and 18 books.');
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding.');
    console.warn('Seeding clears existing users, books, and tickets in the configured database. Use a disposable development database.');
    await Promise.all([User.deleteMany({}), Book.deleteMany({}), Ticket.deleteMany({})]);

    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const authorPassword = process.env.SEED_AUTHOR_PASSWORD || 'password123';
    await User.create({
      name: 'BookLeaf Admin', email: 'admin@bookleaf.com',
      password: await bcrypt.hash(adminPassword, 12), role: 'admin'
    });

    const authorHash = await bcrypt.hash(authorPassword, 12);
    const seededAuthors = new Map();
    for (const author of raw.authors) {
      const user = await User.create({
        name: author.name,
        email: author.email,
        password: authorHash,
        role: 'author',
        phone: author.phone || '',
        city: author.city || '',
        joinedDate: author.joined_date ? new Date(author.joined_date) : null
      });
      seededAuthors.set(author.author_id, user);
      for (const book of author.books || []) {
        await Book.create({
          authorId: user._id,
          sourceBookId: book.book_id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publication_date ? new Date(book.publication_date) : null,
          status: book.status,
          mrp: book.mrp ?? null,
          authorRoyaltyPerCopy: book.author_royalty_per_copy ?? null,
          totalCopiesSold: book.total_copies_sold ?? 0,
          totalRoyaltyEarned: book.total_royalty_earned ?? 0,
          royaltyPaid: book.royalty_paid ?? 0,
          royaltyPending: book.royalty_pending ?? 0,
          lastRoyaltyPayoutDate: book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
          printPartner: book.print_partner ?? null,
          availableOn: book.available_on ?? []
        });
      }
      console.log(`Seeded ${author.author_id}: ${author.name} (${author.books.length} books).`);
    }

    // A demo ticket ensures the admin workflow is testable immediately after seeding.
    const demoAuthor = seededAuthors.get('AUTH001');
    const demoBook = await Book.findOne({ sourceBookId: 'BK001' });
    if (demoAuthor && demoBook) {
      await Ticket.create({
        authorId: demoAuthor._id,
        bookId: demoBook._id,
        subject: 'Royalty payout question',
        description: 'Could you explain my pending royalty balance and when it is expected to be paid?',
        category: 'Royalty & Payments',
        priority: 'Medium',
        status: 'Open'
      });
    }

    const authorCount = await User.countDocuments({ role: 'author' });
    const bookCount = await Book.countDocuments();
    console.log(`Seed complete: ${authorCount} authors, ${bookCount} books, 1 admin.`);
    console.log(`Admin login: admin@bookleaf.com / ${adminPassword}`);
    console.log(`Author login: ${raw.authors[0].email} / ${authorPassword}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
};

seedDatabase();
