/**
 * Seed Admin User Script for Supabase
 * Run: node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdmin() {
  try {
    console.log('⏳ Connecting to Supabase database...');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin123';

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (existing) {
      // Update role to admin if exists
      existing.role = 'admin';
      existing.emailVerified = true;
      existing.isActive = true;
      existing.password = hashedPassword;
      await existing.save();
      console.log('✅ Admin user already exists. Role, active status, and password updated.');
      process.exit(0);
    }

    const admin = new User({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      phone: '9999999999',
      role: 'admin',
      emailVerified: true,
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message || err);
    process.exit(1);
  }
}

seedAdmin();
