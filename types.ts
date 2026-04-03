
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Added missing PizzaSize type export
export type PizzaSize = string;

export interface LocationData {
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
  state?: string;
  postcode?: string;
  display_name?: string;
}

export interface DeliverySettings {
  isLocationBasedEnabled: boolean;
  allowedCityCodes: string[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  deliveryRadius: number; // in KM
  baseDeliveryFee: number;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  value: number;
  minOrderAmount: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface CrustOption {
  name: string;
  price: number;
}

export interface ToppingOption {
  name: string;
  price: number;
}

export interface ProductSize {
  size: string;
  priceModifier: number; // Added to base price
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  category: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  ingredients: string[];
  sizes: ProductSize[];
  crustOptions: CrustOption[];
  extraToppings: ToppingOption[];
  rating: number;
  reviewsCount: number;
  createdAt?: string;
}

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  size: PizzaSize; // Updated to use PizzaSize type
  crust: string;
  toppings: string[];
  image: string;
}

export enum OrderStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PREPARING = 'Preparing',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export interface OrderLog {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface DeliveryDetails {
  branchId?: string;
  branchName?: string;
  distance?: number;
  deliveryFee: number;
  customerLat?: number;
  customerLng?: number;
  fullAddress: string;
  cityCode?: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  address: string;
  deliveryDetails: DeliveryDetails;
  logs: OrderLog[];
  couponCode?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  createdAt: string;
  isBlocked?: boolean;
  phone?: string;
  savedAddresses?: string[];
  lastLocation?: LocationData;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

export interface SiteSettings {
  contactEmail: string;
  contactPhone: string;
  delivery: DeliverySettings;
}
