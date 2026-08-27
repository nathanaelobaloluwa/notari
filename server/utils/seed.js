const bcrypt = require('bcryptjs');
const Event = require('../models/Event');
const Admin = require('../models/Admin');

async function seedData() {
  try {
    // 1. Seed Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
      const defaultPassword = process.env.ADMIN_PASSWORD || 'notari2026';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await Admin.create({
        username: defaultUsername,
        passwordHash,
        clubName: process.env.ADMIN_CLUB || 'Central Admin',
        email:    process.env.ADMIN_EMAIL || 'admin@campus.edu',
        status:   'approved',
        role:     'superadmin'
      });
      console.log(`[Seed] Initialized default superadmin: "${defaultUsername}" (Pass: "${defaultPassword}")`);
    } else {
      // Migrate legacy admins (pre-approval-workflow schema)
      const needsMigration = await Admin.countDocuments({
        $or: [
          { status: { $exists: false } },
          { role: { $in: ['club_exec', undefined] } }
        ]
      });
      if (needsMigration > 0) {
        await Admin.updateMany(
          {
            $or: [
              { status: { $exists: false } },
              { role: { $in: ['club_exec', undefined] } }
            ]
          },
          {
            $set: {
              status: 'approved',
              role: 'superadmin',
              clubName: process.env.ADMIN_CLUB || 'Central Admin',
              email: process.env.ADMIN_EMAIL || 'admin@campus.edu'
            }
          }
        );
        console.log(`[Seed] Migrated ${needsMigration} legacy admin account(s) to approval workflow schema.`);
      }
    }

    // 2. Seed Events if empty
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      const now = new Date();
      
      const sampleEvents = [
        {
          eventName: "Quantum Computing & Neural Nets Symposium",
          organizer: "IEEE Student Branch",
          faculty: "Engineering",
          date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // tomorrow
          venue: "Turing Auditorium, Block E",
          description: "Hands-on keynote and code walkthrough exploring hybrid quantum algorithms and tensor networks for modern deep learning models.",
          contact: "ieee@campus.edu",
          capacity: 45,
          attendees: [
            { name: "Maya Lin", email: "mlin@campus.edu", ticketCode: "NTR-QNT01" },
            { name: "Devon Chen", email: "dchen@campus.edu", ticketCode: "NTR-QNT02" },
            { name: "Amara Obi", email: "aobi@campus.edu", ticketCode: "NTR-QNT03" }
          ]
        },
        {
          eventName: "Annual Inter-Faculty Chess Tournament",
          organizer: "University Chess Guild",
          faculty: "General",
          date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          venue: "Student Union Hall - Central Pavilion",
          description: "Rapid 10+5 Swiss-system tournament. Open to all students, faculty members, and staff. Clocks and boards provided.",
          contact: "chess@campus.edu",
          capacity: 32,
          attendees: [
            { name: "Alex Mercer", email: "alex.m@campus.edu", ticketCode: "NTR-CHS01" },
            { name: "Sophia Rossi", email: "srossi@campus.edu", ticketCode: "NTR-CHS02" }
          ]
        },
        {
          eventName: "Synthetic Biology & CRISPR Workshop",
          organizer: "Biotech Innovators Society",
          faculty: "Sciences",
          date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          venue: "Rosalind Franklin Wet Lab 4",
          description: "Wet-lab demonstration on gene editing precision and bioinformatics pipeline verification for undergraduate research projects.",
          contact: "biotech@campus.edu",
          capacity: 18,
          attendees: [
            { name: "Elena Ramos", email: "eramos@campus.edu", ticketCode: "NTR-BIO01" },
            { name: "Kwame Asante", email: "kasante@campus.edu", ticketCode: "NTR-BIO02" }
          ]
        },
        {
          eventName: "Venture Pitch Night & Founder Mixer",
          organizer: "Campus Entrepreneurs Network",
          faculty: "Business & Law",
          date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
          venue: "Founders Hub, Innovation Center",
          description: "Pitch your startup concept to alumni angel investors, venture scouts, and fellow student co-founders. Pizza and drinks provided.",
          contact: "ventures@campus.edu",
          capacity: 60,
          attendees: [
            { name: "Liam O'Connor", email: "liam.oc@campus.edu", ticketCode: "NTR-VTR01" },
            { name: "Zara Patel", email: "zpatel@campus.edu", ticketCode: "NTR-VTR02" }
          ]
        },
        {
          eventName: "Film Photography & Darkroom Print Masterclass",
          organizer: "Visual Arts Collective",
          faculty: "Arts & Humanities",
          date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          venue: "Basement Darkroom, Fine Arts Hall",
          description: "Learn black-and-white 35mm film developing, contact sheet printing, and silver gelatin enlargement techniques from visiting artist Julian Vance.",
          contact: "arts@campus.edu",
          capacity: 12,
          attendees: [
            { name: "Chloe Bennett", email: "cbennett@campus.edu", ticketCode: "NTR-ART01" }
          ]
        },
        {
          eventName: "Open Mic & Poetry Slam",
          organizer: "Creative Writers Guild",
          faculty: "Arts & Humanities",
          date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
          venue: "The Attic Lounge (Above Campus Cafe)",
          description: "Original spoken word, acoustic sets, storytelling, and free verse. Sign-up at the door or reserve an open seat.",
          contact: "writers@campus.edu",
          capacity: 0 // unlimited
        },
        {
          eventName: "Cardiovascular Health & Wilderness First Aid",
          organizer: "Medical Students Association",
          faculty: "Health Sciences",
          date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
          venue: "Clinical Skills Simulation Suite",
          description: "Certified wilderness CPR, splinting, and emergency trauma triage training workshop with certified paramedics.",
          contact: "medsoc@campus.edu",
          capacity: 20,
          attendees: []
        }
      ];

      await Event.insertMany(sampleEvents);
      console.log(`[Seed] Successfully seeded ${sampleEvents.length} sample events.`);
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial data:', err.message);
  }
}

module.exports = seedData;
