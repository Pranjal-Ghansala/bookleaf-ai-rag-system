import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Ticket from '../models/Ticket.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookleaf-support';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Book.deleteMany({});
    await Ticket.deleteMany({});
    console.log('Cleared existing database collections.');

    // 1. Create Admin User
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      name: 'BookLeaf Admin',
      email: 'admin@bookleaf.com',
      password: hashedAdminPassword,
      role: 'admin'
    });
    console.log('Created admin user: admin@bookleaf.com / admin123');

    // 2. Create Sample Author Users & Books (Simulating bookleaf_sample_data.json structure)
    const hashedPassword = await bcrypt.hash('password123', 10);

    const authorsData = [
      {
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        books: [
          {
            title: 'Whispers of the Ganges',
            isbn: '978-81-987654-1-0',
            genre: 'Fiction',
            publicationDate: new Date('2025-01-15'),
            status: 'Published & Live',
            mrp: 499,
            totalCopiesSold: 320,
            totalRoyaltyEarned: 12760,
            royaltyPaid: 10000,
            royaltyPending: 2760
          },
          {
            title: 'Delhi Traffic Blues',
            isbn: '978-81-987654-1-1',
            genre: 'Humor',
            publicationDate: new Date('2025-06-10'),
            status: 'Published & Live',
            mrp: 350,
            totalCopiesSold: 150,
            totalRoyaltyEarned: 4200,
            royaltyPaid: 0,
            royaltyPending: 4200
          }
        ]
      },
      {
        name: 'Priya Patel',
        email: 'priya@example.com',
        books: [
          {
            title: 'Startup Silicon Valley & Chai',
            isbn: '978-1-68492-332-1',
            genre: 'Business',
            publicationDate: new Date('2024-11-20'),
            status: 'Published & Live',
            mrp: 799,
            totalCopiesSold: 840,
            totalRoyaltyEarned: 42000,
            royaltyPaid: 42000,
            royaltyPending: 0
          }
        ]
      }
    ];

    for (const authorInfo of authorsData) {
      const authorUser = await User.create({
        name: authorInfo.name,
        email: authorInfo.email,
        password: hashedPassword,
        role: 'author'
      });

      for (const bookInfo of authorInfo.books) {
        await Book.create({
          ...bookInfo,
          authorId: authorUser._id
        });
      }
      console.log(`Seeded author: ${authorInfo.name} with books.`);
    }

    // 3. Create Sample Support Ticket to test AI features out-of-the-box
    const sampleAuthor = await User.findOne({ email: 'aarav@example.com' });
    const sampleBook = await Book.findOne({ title: 'Whispers of the Ganges' });

    if (sampleAuthor && sampleBook) {
      await Ticket.create({
        authorId: sampleAuthor._id,
        bookId: sampleBook._id,
        subject: 'Royalty payout delayed for Q3',
        description: 'I published my book 4 months ago and still have not received my royalty payout over the threshold. Please check what is going on.',
        category: 'Royalty & Payments',
        priority: 'High',
        status: 'Open'
      });
      console.log('Created sample support ticket.');
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();