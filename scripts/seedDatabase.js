/**
 * Seed Database Script for Supabase
 * Run: node scripts/seedDatabase.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const supabase = require('../utils/supabase');
const Product = require('../models/Product');
const User = require('../models/User');

// Seed data for products
const seedProducts = async () => {
  try {
    console.log('⏳ Clearing existing products in Supabase...');
    // Clear existing products
    const { error: deleteError } = await supabase.from('products').delete().neq('id', '');
    if (deleteError) {
      console.warn('Warning deleting products:', deleteError.message);
    }

    const products = [
      {
        name: 'Half Dala Machine',
        slug: 'half-dala-machine',
        description: 'Efficient grain processing machine designed to separate grains from stalks, husk, and chaff after harvesting. Built with heavy iron materials for long-lasting performance.',
        shortDescription: 'High-efficiency grain processing machine for agricultural use',
        category: 'grain-processor',
        subcategory: 'half-dala',
        specifications: {
          capacity: '1 Ton/Hour',
          power: '39 HP Tractor / 30 HP Electric',
          size: '6 Inch & 8 Inch',
          material: 'Heavy Iron & Steel',
          weight: '450 kg',
          dimensions: {
            length: '48 inches',
            width: '36 inches',
            height: '60 inches'
          },
          operatingConditions: {
            temperature: '5°C to 45°C',
            humidity: '30% to 90%',
            powerSource: 'Tractor PTO or Electric Motor'
          }
        },
        pricing: {
          basePrice: 85000,
          discountPrice: 79000,
          currency: 'INR',
          taxIncluded: true
        },
        images: [
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.42 PM.jpeg',
            alt: 'Half Dala Machine - Front View',
            isPrimary: true,
            order: 1
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.43 PM.jpeg',
            alt: 'Half Dala Machine - Side View',
            isPrimary: false,
            order: 2
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.43 PM (1).jpeg',
            alt: 'Half Dala Machine - Working',
            isPrimary: false,
            order: 3
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.44 PM.jpeg',
            alt: 'Half Dala Machine - Technical Details',
            isPrimary: false,
            order: 4
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.44 PM (1).jpeg',
            alt: 'Half Dala Machine - Installation',
            isPrimary: false,
            order: 5
          }
        ],
        features: [
          {
            title: 'High Efficiency',
            description: 'Processes 1 ton of grain per hour with minimal grain breakage',
            icon: 'trending-up'
          },
          {
            title: 'Durable Construction',
            description: 'Built with heavy iron and steel for long-lasting performance',
            icon: 'shield'
          },
          {
            title: 'Easy Operation',
            description: 'Simple controls and minimal maintenance requirements',
            icon: 'settings'
          },
          {
            title: 'Versatile Use',
            description: 'Suitable for wheat, paddy, maize and other grains',
            icon: 'refresh-cw'
          }
        ],
        benefits: [
          {
            title: 'Time Saving',
            description: 'Reduces processing time by 70% compared to manual methods'
          },
          {
            title: 'Cost Effective',
            description: 'Lower operational costs with high fuel efficiency'
          },
          {
            title: 'Better Quality',
            description: 'Produces cleaner grain with less breakage'
          }
        ],
        applications: [
          {
            industry: 'Agriculture',
            description: 'Primary grain processing for farmers and cooperatives'
          },
          {
            industry: 'Food Processing',
            description: 'Commercial grain processing units'
          }
        ],
        warranty: {
          duration: 12,
          description: '12 months warranty against manufacturing defects',
          terms: 'Covers all manufacturing defects. Does not include wear and tear items.'
        },
        availability: {
          inStock: true,
          quantity: 15,
          manufacturingTime: '2-3 weeks',
          deliveryTime: '1-2 weeks'
        },
        seo: {
          title: 'Half Dala Machine - High Efficiency Grain Processor | Vishwakarma Foundry',
          description: 'Premium half dala machine for efficient grain processing. Built with heavy iron materials for durability. 1 ton/hour capacity.',
          keywords: ['half dala machine', 'grain processor', 'agricultural machinery', 'thresher', 'grain separator'],
          ogImage: '/images/products/WhatsApp Image 2026-01-23 at 5.24.42 PM.jpeg'
        },
        status: 'active',
        featured: true,
        popular: true,
        rating: {
          average: 4.5,
          count: 127
        },
        tags: ['grain-processor', 'agricultural', 'farm-equipment', 'thresher', 'heavy-duty']
      },
      {
        name: 'Balwan Bhoosi Tank',
        slug: 'balwan-bhoosi-tank',
        description: 'The Balwan Bhoosi Tank is an agricultural storage tank used to store and collect bhoosi (chaff), hay, straw, or dry fodder for animals. Commonly used in farms, dairy farms, and cattle sheds.',
        shortDescription: 'Agricultural storage tank for animal feed and fodder',
        category: 'storage-tank',
        subcategory: 'balwan-bhoosi',
        specifications: {
          capacity: '500-1000 Kg',
          power: 'Manual Operation',
          size: '6 Feet & 8 Feet',
          material: 'Heavy Iron & Steel',
          weight: '120 kg',
          dimensions: {
            length: '72 inches',
            width: '48 inches',
            height: '60 inches'
          },
          operatingConditions: {
            temperature: '0°C to 50°C',
            humidity: '20% to 95%',
            powerSource: 'Manual'
          }
        },
        pricing: {
          basePrice: 35000,
          currency: 'INR',
          taxIncluded: true
        },
        images: [
          {
            url: '/images/products/1.jpeg',
            alt: 'Balwan Bhoosi Tank - Front View',
            isPrimary: true,
            order: 1
          },
          {
            url: '/images/products/2.jpeg',
            alt: 'Balwan Bhoosi Tank - Side View',
            isPrimary: false,
            order: 2
          },
          {
            url: '/images/products/3.jpeg',
            alt: 'Balwan Bhoosi Tank - Top View',
            isPrimary: false,
            order: 3
          },
          {
            url: '/images/products/4.jpeg',
            alt: 'Balwan Bhoosi Tank - Installation',
            isPrimary: false,
            order: 4
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.43 PM.jpeg',
            alt: 'Balwan Bhoosi Tank - In Use',
            isPrimary: false,
            order: 5
          }
        ],
        features: [
          {
            title: 'Large Capacity',
            description: 'Stores 500-1000 kg of fodder efficiently',
            icon: 'package'
          },
          {
            title: 'Durable Build',
            description: 'Heavy iron construction ensures long life',
            icon: 'shield'
          },
          {
            title: 'Weather Resistant',
            description: 'Protects fodder from rain and wind',
            icon: 'cloud'
          },
          {
            title: 'Easy Maintenance',
            description: 'Simple design for easy cleaning and maintenance',
            icon: 'tool'
          }
        ],
        benefits: [
          {
            title: 'Reduces Wastage',
            description: 'Keeps animal feed organized and protected from wastage'
          },
          {
            title: 'Saves Space',
            description: 'Compact design saves valuable farm space'
          },
          {
            title: 'Improves Hygiene',
            description: 'Keeps fodder clean and dry for better animal health'
          }
        ],
        applications: [
          {
            industry: 'Dairy Farming',
            description: 'Storage for cattle and buffalo feed'
          },
          {
            industry: 'Poultry Farming',
            description: 'Storage for chicken feed and litter'
          }
        ],
        warranty: {
          duration: 24,
          description: '24 months warranty against manufacturing defects',
          terms: 'Covers structural integrity and rust protection. Does not include normal wear and tear.'
        },
        availability: {
          inStock: true,
          quantity: 25,
          manufacturingTime: '1-2 weeks',
          deliveryTime: '1 week'
        },
        seo: {
          title: 'Balwan Bhoosi Tank - Agricultural Storage Solution | Vishwakarma Foundry',
          description: 'Premium balwan bhoosi tank for storing animal feed and fodder. Heavy iron construction with 500-1000 kg capacity.',
          keywords: ['bhoosi tank', 'animal feed storage', 'agricultural tank', 'fodder storage', 'farm equipment'],
          ogImage: '/images/products/1.jpeg'
        },
        status: 'active',
        featured: true,
        popular: false,
        rating: {
          average: 4.3,
          count: 89
        },
        tags: ['storage-tank', 'agricultural', 'animal-feed', 'farm-equipment', 'dairy']
      },
      {
        name: 'VFW Half Dala Machine',
        slug: 'vfw-half-dala-machine',
        description: 'A VFW Half Dala Machine is an agricultural threshing machine designed to separate grains from stalks, husk, and chaff after harvesting with improved efficiency and reduced grain breakage.',
        shortDescription: 'Advanced threshing machine with improved efficiency',
        category: 'threshing-machine',
        subcategory: 'vfw-half-dala',
        specifications: {
          capacity: '1.5 Ton/Hour',
          power: '45 HP Tractor / 35 HP Electric',
          size: '24-28 inch Drum',
          material: 'Heavy Iron & Steel',
          weight: '520 kg',
          dimensions: {
            length: '60 inches',
            width: '42 inches',
            height: '72 inches'
          },
          operatingConditions: {
            temperature: '5°C to 45°C',
            humidity: '30% to 90%',
            powerSource: 'Tractor PTO or Electric Motor'
          }
        },
        pricing: {
          basePrice: 120000,
          discountPrice: 110000,
          currency: 'INR',
          taxIncluded: true
        },
        images: [
          {
            url: '/images/products/5.jpeg',
            alt: 'VFW Half Dala Machine - Front View',
            isPrimary: true,
            order: 1
          },
          {
            url: '/images/products/6.jpeg',
            alt: 'VFW Half Dala Machine - Side View',
            isPrimary: false,
            order: 2
          },
          {
            url: '/images/products/7.jpeg',
            alt: 'VFW Half Dala Machine - Working',
            isPrimary: false,
            order: 3
          },
          {
            url: '/images/products/8.jpeg',
            alt: 'VFW Half Dala Machine - Technical Details',
            isPrimary: false,
            order: 4
          },
          {
            url: '/images/products/WhatsApp Image 2026-01-23 at 5.24.43 PM.jpeg',
            alt: 'VFW Half Dala Machine - Installation',
            isPrimary: false,
            order: 5
          }
        ],
        features: [
          {
            title: 'Higher Capacity',
            description: 'Processes 1.5 tons per hour with improved efficiency',
            icon: 'zap'
          },
          {
            title: 'Advanced Design',
            description: 'Half-feed design reduces grain breakage significantly',
            icon: 'award'
          },
          {
            title: 'Robust Build',
            description: 'Heavy duty construction for continuous operation',
            icon: 'construction'
          },
          {
            title: 'Easy Maintenance',
            description: 'Quick access panels for easy cleaning and maintenance',
            icon: 'wrench'
          }
        ],
        benefits: [
          {
            title: 'Higher Output',
            description: '50% more processing capacity compared to standard models'
          },
          {
            title: 'Better Quality',
            description: 'Reduced grain breakage improves overall grain quality'
          },
          {
            title: 'Lower Operating Cost',
            description: 'Efficient design reduces power consumption'
          }
        ],
        applications: [
          {
            industry: 'Large Scale Farming',
            description: 'Ideal for commercial agricultural operations'
          },
          {
            industry: 'Custom Processing',
            description: 'Suitable for custom grain processing units'
          }
        ],
        warranty: {
          duration: 18,
          description: '18 months warranty against manufacturing defects',
          terms: 'Comprehensive warranty covering all mechanical and electrical components.'
        },
        availability: {
          inStock: true,
          quantity: 8,
          manufacturingTime: '3-4 weeks',
          deliveryTime: '2 weeks'
        },
        seo: {
          title: 'VFW Half Dala Machine - Advanced Threshing Solution | Vishwakarma Foundry',
          description: 'Premium VFW half dala machine with 1.5 ton/hour capacity. Advanced threshing technology for commercial use.',
          keywords: ['VFW half dala', 'threshing machine', 'agricultural equipment', 'grain processor', 'commercial'],
          ogImage: '/images/products/5.jpeg'
        },
        status: 'active',
        featured: true,
        popular: true,
        rating: {
          average: 4.7,
          count: 45
        },
        tags: ['threshing-machine', 'agricultural', 'commercial', 'grain-processor', 'heavy-duty']
      }
    ];

    for (const prodData of products) {
      await Product.create(prodData);
    }
    console.log('✅ Products seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding products:', error.message || error);
  }
};

// Seed admin user
const seedAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@vishwakarmafoundry.com' });
    if (existingAdmin) {
      console.log('✅ Admin user admin@vishwakarmafoundry.com already exists');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@vishwakarmafoundry.com',
      password: hashedPassword,
      phone: '9876543210',
      role: 'admin',
      company: 'Vishwakarma Foundry Works',
      businessType: 'manufacturer',
      address: {
        street: 'Industrial Area, Sector 82',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201009',
        country: 'India'
      },
      emailVerified: true,
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user admin@vishwakarmafoundry.com created successfully');
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message || error);
  }
};

// Seed standard user
const seedStandardUser = async () => {
  try {
    const existingUser = await User.findOne({ email: 'user@gmail.com' });
    if (existingUser) {
      console.log('✅ Standard user user@gmail.com already exists');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('user123', salt);

    const standardUser = new User({
      name: 'Standard Farmer',
      email: 'user@gmail.com',
      password: hashedPassword,
      phone: '9876543211',
      role: 'user',
      company: 'Green Fields Farm',
      businessType: 'farmer',
      address: {
        street: 'Main Road, Village Pipri',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201009',
        country: 'India'
      },
      emailVerified: true,
      isActive: true
    });

    await standardUser.save();
    console.log('✅ Standard user user@gmail.com created successfully');
  } catch (error) {
    console.error('❌ Error creating standard user:', error.message || error);
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('⏳ Starting database seeding...');
    
    await seedProducts();
    await seedAdminUser();
    await seedStandardUser();
    
    console.log('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message || error);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedProducts, seedAdminUser, seedStandardUser };
