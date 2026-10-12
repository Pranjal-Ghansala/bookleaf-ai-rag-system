import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceBookId: { type: String, index: true },
  title: { type: String, required: true },
  isbn: { type: String, required: true, unique: true },
  genre: { type: String, required: true },
  publicationDate: { type: Date, default: null },
  status: { type: String, required: true },
  mrp: { type: Number, default: null },
  authorRoyaltyPerCopy: { type: Number, default: null },
  totalCopiesSold: { type: Number, default: 0 },
  totalRoyaltyEarned: { type: Number, default: 0 },
  royaltyPaid: { type: Number, default: 0 },
  royaltyPending: { type: Number, default: 0 },
  lastRoyaltyPayoutDate: { type: Date, default: null },
  printPartner: { type: String, default: null },
  availableOn: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model('Book', bookSchema);
