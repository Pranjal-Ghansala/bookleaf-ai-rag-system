import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['author', 'admin'], default: 'author' },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  joinedDate: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
