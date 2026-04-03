import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  items: [{
    productId: String,
    name: String,
    quantity: Number,
    totalPrice: Number,
    size: String,
    crust: String,
    toppings: [String]
  }],
  subtotal: Number,
  discount: Number,
  deliveryFee: Number,
  totalAmount: Number,
  status: { type: String, default: 'Pending' },
  address: String,
  deliveryDetails: {
    fullAddress: String,
    cityCode: String,
    customerLat: Number,
    customerLng: Number
  },
  logs: [{ 
    status: String, 
    timestamp: { type: Date, default: Date.now }, 
    note: String 
  }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Order = mongoose.model('Order', orderSchema);
export default Order;
