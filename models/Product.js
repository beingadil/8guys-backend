import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: Number,
  image: String,
  category: String,
  isVegetarian: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  ingredients: [String],
  sizes: [{ size: String, priceModifier: Number }],
  crustOptions: [{ name: String, price: Number }],
  extraToppings: [{ name: String, price: Number }],
  rating: { type: Number, default: 4.5 },
  reviewsCount: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Product = mongoose.model('Product', productSchema);
export default Product;
