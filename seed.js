require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Property = require('./models/Property');
const Enquiry = require('./models/Enquiry');
const Favourite = require('./models/Favourite');
const Rating = require('./models/Rating');

const seedData = async () => {
  try {
    console.log('🌱 [Seed] Initializing database seeding...');
    await connectDB();

    // 1. Clean existing collections
    await User.deleteMany({});
    await Property.deleteMany({});
    await Enquiry.deleteMany({});
    await Favourite.deleteMany({});
    await Rating.deleteMany({});
    console.log('🧹 [Seed] Existing collections cleaned.');

    // 2. Hash passwords
    const adminPassword = await User.hashPassword('Admin@123');
    const agentPassword = await User.hashPassword('Agent@123');
    const buyerPassword = await User.hashPassword('Buyer@123');

    // 3. Create Users
    const users = await User.create([
      {
        name: 'Admin Kumar',
        email: 'admin@realestate.com',
        passwordHash: adminPassword,
        role: 'ADMIN',
        phone: '+91 90000 00001'
      },
      {
        name: 'Ravi Sharma',
        email: 'agent.ravi@realestate.com',
        passwordHash: agentPassword,
        role: 'AGENT',
        agencyName: 'Ravi Premier Realty',
        phone: '+91 98765 43210'
      },
      {
        name: 'Anita Desai',
        email: 'agent.anita@realestate.com',
        passwordHash: agentPassword,
        role: 'AGENT',
        agencyName: 'Metro Living Consultants',
        phone: '+91 98111 22334'
      },
      {
        name: 'Priya Nair',
        email: 'buyer.priya@gmail.com',
        passwordHash: buyerPassword,
        role: 'BUYER',
        phone: '+91 98222 33445'
      },
      {
        name: 'Rahul Varma',
        email: 'buyer.rahul@gmail.com',
        passwordHash: buyerPassword,
        role: 'BUYER',
        phone: '+91 98333 44556'
      },
      {
        name: 'Deepa Menon',
        email: 'buyer.deepa@gmail.com',
        passwordHash: buyerPassword,
        role: 'BUYER',
        phone: '+91 98444 55667'
      }
    ]);

    const admin = users[0];
    const agentRavi = users[1];
    const agentAnita = users[2];
    const buyerPriya = users[3];
    const buyerRahul = users[4];
    const buyerDeepa = users[5];

    console.log(`👤 [Seed] Created ${users.length} users (1 Admin, 2 Agents, 3 Buyers).`);

    // 4. Create Properties
    const properties = await Property.create([
      // Verified Listings
      {
        agentId: agentRavi._id,
        title: 'Modern 4 BHK Luxury Villa with Private Pool',
        description: 'Spectacular architectural villa located in upscale gated community with private garden, swimming pool, Italian marble flooring, and smart home automation.',
        type: 'Villa',
        listingType: 'SALE',
        price: 38500000,
        city: 'Bengaluru',
        locality: 'Whitefield',
        bedrooms: 4,
        bathrooms: 5,
        area: 4200,
        images: [
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-10T10:00:00Z')
      },
      {
        agentId: agentRavi._id,
        title: 'Spacious 2 BHK Apartment near Indiranagar Metro',
        description: 'Semi-furnished contemporary flat with modern kitchen fittings, 2 balconies, dedicated basement car parking, and 24x7 power backup.',
        type: 'Apartment',
        listingType: 'RENT',
        price: 45000,
        city: 'Bengaluru',
        locality: 'Indiranagar',
        bedrooms: 2,
        bathrooms: 2,
        area: 1350,
        images: [
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-12T11:30:00Z')
      },
      {
        agentId: agentAnita._id,
        title: 'Luxury 3 BHK Waterfront Penthouse on Marine Drive',
        description: 'Breathtaking panoramic Arabian sea views, double-height ceiling living room, designer modular kitchen, infinity pool access, and club house amenities.',
        type: 'Apartment',
        listingType: 'SALE',
        price: 24000000,
        city: 'Kochi',
        locality: 'Marine Drive',
        bedrooms: 3,
        bathrooms: 3,
        area: 2750,
        images: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-15T09:15:00Z')
      },
      {
        agentId: agentAnita._id,
        title: 'Prime Grade-A Commercial Office Space',
        description: 'Furnished commercial IT/consulting office space ready for occupancy with 40 workstations, 2 conference rooms, server room, and cafeteria access.',
        type: 'Commercial',
        listingType: 'RENT',
        price: 180000,
        city: 'Bengaluru',
        locality: 'MG Road',
        bedrooms: 0,
        bathrooms: 4,
        area: 3200,
        images: [
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-18T14:00:00Z')
      },
      {
        agentId: agentRavi._id,
        title: 'Serene 3 BHK Traditional Kerala Heritage House',
        description: 'Authentic nalukettu architecture blended with modern amenities, wooden carvings, landscaped courtyard, open well, and quiet residential setting.',
        type: 'House',
        listingType: 'SALE',
        price: 12500000,
        city: 'Kottayam',
        locality: 'Baker Junction',
        bedrooms: 3,
        bathrooms: 3,
        area: 2400,
        images: [
          'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'UNDER_NEGOTIATION',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-20T16:45:00Z')
      },
      {
        agentId: agentAnita._id,
        title: 'Premium Gated Community Residential Plot (15 Cents)',
        description: 'Corner plot with dual road access, clear titles, municipal water connection, and rapid access to Infopark Kakkanad.',
        type: 'Plot',
        listingType: 'SALE',
        price: 9500000,
        city: 'Kochi',
        locality: 'Kakkanad',
        bedrooms: 0,
        bathrooms: 0,
        area: 6534,
        images: [
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'SOLD',
        isVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-01-05T08:00:00Z')
      },
      // PENDING Listings (For Admin Verification Demo)
      {
        agentId: agentRavi._id,
        title: 'Newly Built 3 BHK Smart Flat near Infopark',
        description: 'Newly constructed high-rise apartment near SmartCity with EV charging bay, club house, squash court, and scenic greenery view.',
        type: 'Apartment',
        listingType: 'SALE',
        price: 8800000,
        city: 'Kochi',
        locality: 'Kakkanad',
        bedrooms: 3,
        bathrooms: 3,
        area: 1650,
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null
      },
      {
        agentId: agentAnita._id,
        title: 'Commercial Showroom on Main Road frontage',
        description: 'High-visibility ground floor retail/commercial showroom with 50 feet road frontage, ample customer parking, and high footfall location.',
        type: 'Commercial',
        listingType: 'RENT',
        price: 95000,
        city: 'Kottayam',
        locality: 'Kanjikuzhy',
        bedrooms: 0,
        bathrooms: 2,
        area: 1800,
        images: [
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null
      },
      // REJECTED Listing (For Admin Review Demo)
      {
        agentId: agentRavi._id,
        title: 'Unapproved Farmland Subdivision Plot',
        description: 'Scenic agricultural parcel without converted land use permit or municipal layout sanction.',
        type: 'Plot',
        listingType: 'SALE',
        price: 3200000,
        city: 'Kottayam',
        locality: 'Pala',
        bedrooms: 0,
        bathrooms: 0,
        area: 4356,
        images: [
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80'
        ],
        status: 'AVAILABLE',
        isVerified: false,
        verifiedBy: admin._id,
        verifiedAt: new Date('2026-02-01T12:00:00Z'),
        rejectionReason: 'Missing RERA registration certificate and municipal layout conversion order.'
      }
    ]);

    console.log(`🏠 [Seed] Created ${properties.length} properties (6 Verified, 2 Pending, 1 Rejected).`);

    // 5. Create Enquiries
    const enquiries = await Enquiry.create([
      {
        propertyId: properties[0]._id, // Bengaluru Villa
        buyerId: buyerPriya._id,
        message: 'Hello, I am very interested in this 4 BHK villa. Could you please share the floor plan and schedule an on-site visit this Saturday afternoon?',
        status: 'NEW',
        remarks: ''
      },
      {
        propertyId: properties[1]._id, // Indiranagar Flat
        buyerId: buyerRahul._id,
        message: 'Hi Ravi, is the apartment pet-friendly? Also looking to know if maintenance charges are included in the ₹45,000 rent.',
        status: 'CONTACTED',
        remarks: 'Called buyer, confirmed pet-friendly building. Sharing lease draft.'
      },
      {
        propertyId: properties[2]._id, // Kochi Marine Drive Penthouse
        buyerId: buyerDeepa._id,
        message: 'Dear Anita, please let me know if price negotiation is possible for an upfront payment. We are planning a relocation to Kochi next month.',
        status: 'APPROVED',
        remarks: 'Buyer loan pre-approval verified by SBI Bank. Deal agreement in progress.'
      },
      {
        propertyId: properties[3]._id, // Commercial MG Road
        buyerId: buyerDeepa._id,
        message: 'Inquiring for our tech consultancy branch office setup. Are optical fiber connections already installed?',
        status: 'CLOSED',
        remarks: 'Tenancy agreement signed for 3 years lease.'
      }
    ]);

    console.log(`📬 [Seed] Created ${enquiries.length} enquiries.`);

    // 6. Create Favourites
    const favourites = await Favourite.create([
      { userId: buyerPriya._id, propertyId: properties[0]._id },
      { userId: buyerPriya._id, propertyId: properties[2]._id },
      { userId: buyerRahul._id, propertyId: properties[1]._id },
      { userId: buyerDeepa._id, propertyId: properties[0]._id }
    ]);

    console.log(`❤️ [Seed] Created ${favourites.length} saved favourites.`);

    // 7. Create Agent Ratings
    const ratings = await Rating.create([
      {
        agentId: agentRavi._id,
        buyerId: buyerPriya._id,
        rating: 5,
        review: 'Ravi was outstanding! Extremely transparent with documentation and property disclosures.'
      },
      {
        agentId: agentAnita._id,
        buyerId: buyerRahul._id,
        rating: 4,
        review: 'Prompt responses and very polite guidance through the Kochi real estate market.'
      }
    ]);

    console.log(`⭐ [Seed] Created ${ratings.length} agent ratings.`);

    console.log('\n======================================================');
    console.log('🎉 [Seed] Database seeded successfully!');
    console.log('======================================================');
    console.log('DEMO USER CREDENTIALS FOR TESTING:');
    console.log('1. Admin: admin@realestate.com / Admin@123');
    console.log('2. Agent 1: agent.ravi@realestate.com / Agent@123');
    console.log('3. Agent 2: agent.anita@realestate.com / Agent@123');
    console.log('4. Buyer 1: buyer.priya@gmail.com / Buyer@123');
    console.log('5. Buyer 2: buyer.rahul@gmail.com / Buyer@123');
    console.log('6. Buyer 3: buyer.deepa@gmail.com / Buyer@123');
    console.log('======================================================\n');

    return true;
  } catch (error) {
    console.error('❌ [Seed] Error seeding database:', error);
    throw error;
  }
};

// If run directly via node seed.js
if (require.main === module) {
  seedData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = seedData;
