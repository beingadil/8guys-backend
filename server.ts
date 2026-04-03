import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const PORT = Number(process.env.PORT) || 8080;

const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID || 'branch-1';
const DEFAULT_DELIVERY_FEE = Number(process.env.DEFAULT_DELIVERY_FEE) || 150;
const DEFAULT_ESTIMATED_TIME = process.env.DEFAULT_ESTIMATED_TIME || '30-45 min';

if (!process.env.JWT_SECRET) {
  if (IS_PRODUCTION) {
    throw new Error('CRITICAL: JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️ JWT_SECRET not set. Using insecure default for development only.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_ONLY_INSECURE_KEY_DO_NOT_USE_IN_PRODUCTION';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.WEBSITE_HOSTNAME 
  ? `https://${process.env.WEBSITE_HOSTNAME}` 
  : 'http://localhost:5173';

const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  process.env.ALLOWED_ORIGIN_1,
  process.env.ALLOWED_ORIGIN_2,
  process.env.ALLOWED_ORIGIN_3,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

if (!MONGO_URI) {
  console.error('❌ CRITICAL ERROR: No MongoDB URI provided. Set MONGO_URI environment variable.');
  if (IS_PRODUCTION) {
    throw new Error('MongoDB URI is required in production');
  }
}

if (IS_PRODUCTION) {
  console.log('🚀 Running in PRODUCTION mode');
} else {
  console.log('🔧 Running in DEVELOPMENT mode');
}

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const finalExt = allowedExts.includes(ext) ? ext : '.jpg';
    cb(null, `img-${uniqueSuffix}${finalExt}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION,
  crossOriginEmbedderPolicy: IS_PRODUCTION,
}));

app.use(compression());

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(uploadDir, {
  maxAge: IS_PRODUCTION ? '1d' : 0,
  etag: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

const connectDB = async () => {
  if (!MONGO_URI) return false;
  
  const maxRetries = 5;
  const retryDelay = 5000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 MongoDB connection attempt ${attempt}/${maxRetries}...`);
      
      await mongoose.connect(MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
      });
      
      console.log('✅ MongoDB Connected Successfully');
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
      
      return true;
    } catch (err: any) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.error('❌ All MongoDB connection attempts failed');
  return false;
};

let isMongoConnected = false;
let mongoConnectionPromise = connectDB().then(connected => {
  isMongoConnected = connected;
  return connected;
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  basePrice: { type: Number, required: true, min: 0 },
  image: { type: String },
  category: { type: String, trim: true },
  isVegetarian: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  ingredients: [String],
  sizes: [{ size: String, priceModifier: Number }],
  crustOptions: [{ name: String, price: Number }],
  extraToppings: [{ name: String, price: Number }],
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isAvailable: 1 });

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  items: [{
    productId: String,
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    size: String,
    crust: String,
    toppings: [String]
  }],
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Pending' },
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

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token has expired.' });
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token.' });
      }
      return res.status(401).json({ error: 'Authentication failed.' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const admin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: NODE_ENV,
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected) {
      await mongoConnectionPromise;
    }
    
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({ ready: true, mongodb: 'connected' });
    } else {
      res.status(503).json({ ready: false, mongodb: 'disconnected' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Service not ready' });
  }
});

app.post('/api/auth/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered.' });
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  const user = await User.create({ 
    name: name.trim(), 
    email: email.toLowerCase().trim(), 
    password: hashedPassword 
  });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ 
    user: { id: user._id, name: user.name, email: user.email, role: user.role }, 
    token 
  });
}));

app.post('/api/auth/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user: any = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: 'Your account has been blocked. Contact support.' });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ 
    user: { id: user._id, name: user.name, email: user.email, role: user.role }, 
    token 
  });
}));

app.post('/api/upload', auth, admin, upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  const protocol = IS_PRODUCTION ? 'https' : 'http';
  const host = req.get('host');
  const url = `/uploads/${req.file.filename}`;
  
  res.json({ 
    url,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
}));

app.get('/api/products', asyncHandler(async (req: Request, res: Response) => {
  const { category, available } = req.query;
  
  const filter: any = {};
  if (category) filter.category = category;
  if (available !== undefined) filter.isAvailable = available === 'true';
  
  const products = await Product.find(filter).sort({ createdAt: -1 });
  
  const normalized = products.map(p => ({
    ...p.toObject(),
    id: p._id.toString(),
    _id: p._id.toString()
  }));
  
  res.json(normalized);
}));

app.post('/api/products', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const { name, basePrice } = req.body;
  
  if (!name || basePrice === undefined) {
    return res.status(400).json({ error: 'Name and base price are required.' });
  }
  
  if (basePrice < 0) {
    return res.status(400).json({ error: 'Base price cannot be negative.' });
  }

  const product = await Product.create(req.body);
  
  const normalized = {
    ...product.toObject(),
    id: product._id.toString(),
    _id: product._id.toString()
  };
  
  res.status(201).json(normalized);
}));

app.put('/api/products/:id', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  
  const normalized = {
    ...product.toObject(),
    id: product._id.toString(),
    _id: product._id.toString()
  };
  
  res.json(normalized);
}));

app.delete('/api/products/:id', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  
  res.json({ message: 'Product deleted successfully.', success: true });
}));

app.get('/api/users', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
}));

app.post('/api/users/:id/toggle-block', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot block admin users.' });
  }
  
  user.isBlocked = !user.isBlocked;
  await user.save();
  
  res.json({ 
    message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
    isBlocked: user.isBlocked 
  });
}));

app.put('/api/users/profile', auth, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.body;
  
  const updateData: any = {};
  if (name) updateData.name = name;
  
  const updatedUser = await User.findByIdAndUpdate(user.id, updateData, { new: true }).select('-password');
  
  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  res.json(updatedUser);
}));

app.get('/api/stats', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const [totalUsers, totalProducts, orders] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.find()
  ]);
  
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = orders.filter(o => ['Pending', 'Confirmed', 'Preparing'].includes(o.status)).length;
  
  res.json({ 
    totalUsers, 
    totalOrders: orders.length,
    totalProducts,
    totalRevenue,
    pendingOrders
  });
}));

app.get('/api/orders', auth, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter = user.role === 'admin' ? {} : { userId: user.id };
  
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);
  
  res.json(orders);
}));

app.post('/api/orders', auth, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { items, totalAmount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  if (!totalAmount || totalAmount < 0) {
    return res.status(400).json({ error: 'Invalid total amount.' });
  }

  const orderData = { 
    ...req.body, 
    userId: user.id, 
    userEmail: user.email 
  };
  
  const order = await Order.create(orderData);
  
  res.status(201).json(order);
}));

app.put('/api/orders/:id/status', auth, admin, asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;
  
  const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  order.status = status;
  order.logs = order.logs || [];
  order.logs.push({
    status,
    timestamp: new Date(),
    note: note || `Status updated to ${status} by admin`
  });

  await order.save();
  
  console.log(`[Order] ${req.params.id} status updated to ${status}`);
  res.json(order);
}));

app.post('/api/coupons/validate', auth, asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }
  
  const COUPONS: Record<string, { discount: number; minOrder: number }> = {
    'PIZZA10': { discount: 10, minOrder: 500 },
    'FIRST50': { discount: 50, minOrder: 300 },
    'SAVE20': { discount: 20, minOrder: 1000 },
  };
  
  const coupon = COUPONS[code.toUpperCase()];
  
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon code.' });
  }
  
  if (subtotal < coupon.minOrder) {
    return res.status(400).json({ 
      error: `Minimum order amount for this coupon is PKR ${coupon.minOrder}.` 
    });
  }
  
  res.json({
    valid: true,
    code: code.toUpperCase(),
    discount: coupon.discount,
    message: `Coupon applied! You save PKR ${coupon.discount}.`
  });
}));

app.post('/api/location/verify', asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  
  res.json({
    success: true,
    message: 'Location verified for delivery',
    branchId: DEFAULT_BRANCH_ID,
    deliveryFee: DEFAULT_DELIVERY_FEE,
    estimatedTime: DEFAULT_ESTIMATED_TIME
  });
}));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error: ' + err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  res.status(500).json({ error: IS_PRODUCTION ? 'Internal server error.' : err.message });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });

  setTimeout(() => {
    console.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 8Guys Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`);
});

export default app;
