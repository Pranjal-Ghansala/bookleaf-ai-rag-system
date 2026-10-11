import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  isbn: { type: String, required: true, unique: true },
  genre: { type: String, required: true },
  publicationDate: { type: Date },
  status: { type: String, required: true },
  mrp: { type: Number, required: true },
  totalCopiesSold: { type: Number, default: 0 },
  totalRoyaltyEarned: { type: Number, default: 0 },
  royaltyPaid: { type: Number, default: 0 },
  royaltyPending: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Book', bookSchema);