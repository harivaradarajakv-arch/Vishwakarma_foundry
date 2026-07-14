-- Supabase Database Schema DDL for Vishwakarma Foundry Works
-- Uses PostgreSQL with JSONB to mimic NoSQL document flexibility and support all Mongoose schema structures.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS warranties CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Can be MongoDB ObjectId or UUID/text
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds address, preferences, businessType, name, password hash, etc.
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 2. PRODUCTS TABLE
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grain-processor', 'storage-tank', 'threshing-machine', 'spare-parts', 'other')),
  subcategory TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'discontinued')),
  featured BOOLEAN DEFAULT FALSE,
  popular BOOLEAN DEFAULT FALSE,
  base_price NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds specifications, images, videos, features, benefits, applications, warranty, availability, seo, rating, tags, relatedProducts, variants, reviews
);

-- Indexes for products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status_featured ON products(status, featured);
CREATE INDEX idx_products_price ON products(base_price);

-- 3. INQUIRIES TABLE
CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds subject, message, contactInfo, attachments, responses, assignedTo, resolution, metadata, followUpRequired, followUpDate, tags, internalNotes
);

-- Indexes for inquiries
CREATE INDEX idx_inquiries_user ON inquiries(user_id);
CREATE INDEX idx_inquiries_product ON inquiries(product_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

-- 4. ORDERS TABLE
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'manufacturing', 'quality-check', 'ready', 'shipped', 'delivered', 'installed', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds items, pricing, paymentMethod, paymentDetails, shippingAddress, billingAddress, timeline, installation, warranty, documents, notes, estimatedDelivery, tracking
);

-- Indexes for orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 5. REVIEWS TABLE
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds comment, images, verified, helpful
);

-- Indexes for reviews
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- 6. WARRANTIES TABLE
CREATE TABLE warranties (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  warranty_number TEXT UNIQUE NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claim-pending', 'claim-in-progress', 'void')),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL -- Holds purchaseDate, installationDate, dealerName, dealerContact, installationAddress, claims, documents, serviceHistory, extendedWarranty, notes
);

-- Indexes for warranties
CREATE INDEX idx_warranties_user ON warranties(user_id);
CREATE INDEX idx_warranties_product ON warranties(product_id);
CREATE INDEX idx_warranties_number ON warranties(warranty_number);
CREATE INDEX idx_warranties_serial ON warranties(serial_number);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_expiry ON warranties(expiry_date);
