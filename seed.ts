import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is required. Set the MONGO_URI environment variable.');
  process.exit(1);
}

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
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const seedProducts = [
    {
        name: 'Margherita Classic',
        description: 'Authentic Italian taste with fresh basil, mozzarella, and our signature tomato sauce.',
        basePrice: 1200,
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: true,
        isAvailable: true,
        ingredients: ['Mozzarella', 'Fresh Basil', 'Tomato Sauce', 'Olive Oil'],
        sizes: [{ size: 'Small', priceModifier: -300 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 400 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 300 }],
        extraToppings: [{ name: 'Extra Cheese', price: 150 }, { name: 'Olives', price: 100 }, { name: 'Jalapenos', price: 100 }],
        rating: 4.8,
        reviewsCount: 124
    },
    {
        name: 'The 8Guys Signature',
        description: 'Our ultimate premium pizza loaded with 8 types of meat, premium cheese blend, and signature sauce.',
        basePrice: 2200,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: false,
        isAvailable: true,
        ingredients: ['Pepperoni', 'Italian Sausage', 'Smoked Bacon', 'Ham', 'Beef chunks', 'Chicken Tikka', 'Salami', 'Prosciutto', 'Mozzarella', 'Signature Sauce'],
        sizes: [{ size: 'Small', priceModifier: -500 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 700 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Cheese Burst', price: 300 }, { name: 'Sausage Stuffed Crust', price: 400 }],
        extraToppings: [{ name: 'Extra Cheese', price: 200 }, { name: 'Mushrooms', price: 150 }, { name: 'Caramelized Onions', price: 100 }],
        rating: 4.9,
        reviewsCount: 342
    },
    {
        name: 'Classic Pepperoni',
        description: 'A timeless favorite packed with generous slices of premium beef pepperoni and gooey mozzarella.',
        basePrice: 1500,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: false,
        isAvailable: true,
        ingredients: ['Beef Pepperoni', 'Mozzarella', 'Tomato Sauce'],
        sizes: [{ size: 'Small', priceModifier: -400 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 500 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 300 }],
        extraToppings: [{ name: 'Extra Cheese', price: 150 }, { name: 'Extra Pepperoni', price: 200 }, { name: 'Chili Flakes', price: 50 }],
        rating: 4.7,
        reviewsCount: 289
    },
    {
        name: 'BBQ Chicken Supreme',
        description: 'Smoky BBQ sauce base topped with grilled chicken, red onions, sweet corn, and fresh cilantro.',
        basePrice: 1800,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: false,
        isAvailable: true,
        ingredients: ['Grilled Chicken', 'BBQ Sauce', 'Red Onions', 'Sweet Corn', 'Cilantro', 'Mozzarella'],
        sizes: [{ size: 'Small', priceModifier: -450 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 600 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 300 }],
        extraToppings: [{ name: 'Extra Chicken', price: 200 }, { name: 'Jalapenos', price: 100 }, { name: 'Extra Cheese', price: 150 }],
        rating: 4.6,
        reviewsCount: 156
    },
    {
        name: 'Vegetarian Truffle Mushroom',
        description: 'An elegant white pizza with roasted wild mushrooms, truffle oil, roasted garlic, and parmesan.',
        basePrice: 1650,
        image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: true,
        isAvailable: true,
        ingredients: ['Wild Mushrooms', 'Truffle Oil', 'Roasted Garlic', 'Parmesan', 'Mozzarella', 'White Sauce Base'],
        sizes: [{ size: 'Small', priceModifier: -400 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 550 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Thin Crust', price: 0 }],
        extraToppings: [{ name: 'Extra Truffle Oil', price: 150 }, { name: 'Caramelized Onions', price: 100 }, { name: 'Spinach', price: 100 }],
        rating: 4.5,
        reviewsCount: 98
    },
    {
        name: 'Spicy Peri-Peri Chicken',
        description: 'For spice lovers: Peri-peri flavored chicken, mixed bell peppers, jalapenos, and a drizzle of spicy mayo.',
        basePrice: 1750,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        category: 'Pizza',
        isVegetarian: false,
        isAvailable: true,
        ingredients: ['Peri-Peri Chicken', 'Bell Peppers', 'Jalapenos', 'Spicy Mayo', 'Mozzarella', 'Tomato Sauce'],
        sizes: [{ size: 'Small', priceModifier: -400 }, { size: 'Medium', priceModifier: 0 }, { size: 'Large', priceModifier: 550 }],
        crustOptions: [{ name: 'Hand Tossed', price: 0 }, { name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 300 }],
        extraToppings: [{ name: 'Extra Chicken', price: 200 }, { name: 'Extra Jalapenos', price: 100 }, { name: 'Chili Flakes', price: 50 }],
        rating: 4.7,
        reviewsCount: 210
    }
];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@8guys.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin';

if (!ADMIN_PASSWORD) {
    console.warn('⚠️ ADMIN_PASSWORD not set. Admin account will not be created. Set ADMIN_PASSWORD environment variable.');
}

const seedDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI!);
        console.log('✅ Connected to MongoDB successfully.');

        console.log('🗑️ Clearing existing products...');
        await Product.deleteMany({});

        console.log('📦 Inserting new products...');
        await Product.insertMany(seedProducts);
        console.log(`✅ Inserted ${seedProducts.length} products.`);

        if (ADMIN_PASSWORD) {
            console.log('👤 Setting up admin account...');
            const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

            if (!existingAdmin) {
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
                await User.create({
                    name: ADMIN_NAME,
                    email: ADMIN_EMAIL,
                    password: hashedPassword,
                    role: 'admin'
                });
                console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
                console.log(`   ⚠️ Remember to change this password after first login!`);
            } else {
                console.log(`ℹ️ Admin account already exists: ${ADMIN_EMAIL}`);
            }
        } else {
            console.log('ℹ️ Skipping admin account creation (ADMIN_PASSWORD not set).');
        }

        console.log('🎉 Database seeding completed successfully!');
    } catch (err: any) {
        console.error('❌ Error seeding database:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB.');
    }
};

seedDB();
