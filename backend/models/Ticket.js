import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'Royalty & Payments', 
      'ISBN & Metadata Issues', 
      'Printing & Quality', 
      'Distribution & Availability', 
      'Book Status & Production Updates', 
      'General Inquiry'
    ],
    default: 'General Inquiry'
  },
  priority: { 
    type: String, 
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  internalNotes: [{
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  messages: [{
    sender: { type: String, enum: ['author', 'admin'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);