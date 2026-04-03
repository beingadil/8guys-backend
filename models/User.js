import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: String,
  savedAddresses: [String],
  lastLocation: {
    latitude: Number,
    longitude: Number,
    country: String,
    city: String,
    state: String,
    postcode: String,
    display_name: String
  },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const User = mongoose.model('User', userSchema);
export default User;
