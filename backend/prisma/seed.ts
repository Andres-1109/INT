/*
  FILE: prisma/seed.ts

  What does this file do?
  Fills the database with test data (users, spaces, bookings, reviews,
  favorites) so the app can be demoed and tested with the same
  credentials as always, without needing to click through every flow by
  hand first.

  Run with: npm run seed
  (safe to run more than once: each run wipes the previous data and
  recreates it from scratch)
*/

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

// Same fee/tax constants as bookingsController.ts — kept in sync manually
// since this script inserts bookings directly through Prisma instead of
// going through the API, so the controller's own calculation never runs.
const GUEST_FEE_RATE = 0.12;
const HOST_FEE_RATE = 0.06;
const TAX_RATE = 0.19;
const RESPONSE_WINDOW_HOURS = 24;
const HOST_LATE_CANCEL_PENALTY_RATE = 0.20;
const HOST_LATE_CANCEL_COMPENSATION_RATE = 0.10;

// Mirrors applyFirstBookingDiscount() + the fee math in
// bookingsController.createBooking, so seeded bookings show the same
// numbers a real booking made through the app would.
function calculateBookingFinancials(pricePerHour: number, hours: number, isFirstBooking: boolean) {
  const rawBasePrice = pricePerHour * hours;
  const basePrice = isFirstBooking ? Math.max(0, rawBasePrice - pricePerHour) : rawBasePrice;

  const guestFee = basePrice * GUEST_FEE_RATE;
  const guestFeeTax = guestFee * TAX_RATE;
  const total = basePrice + guestFee + guestFeeTax;

  const hostFee = basePrice * HOST_FEE_RATE;
  const hostFeeTax = hostFee * TAX_RATE;
  const hostNet = basePrice - hostFee - hostFeeTax;

  return { basePrice, guestFee, guestFeeTax, hostFee, hostFeeTax, total, hostNet };
}

// A UTC-midnight Date `offsetDays` away from today — negative for the
// past (used for "completed"/cancelled/rejected bookings), positive for
// the future (used for "pending_approval"/"confirmed"). Uses setUTCDate,
// not setDate, for the same reason combineDateAndTime() in
// bookingsController.ts uses setUTCHours — see docs/resolved-bugs.md, bug #4.
function daysFromNow(offsetDays: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const AMENITY_NAMES = [
  'wifi', 'projector', 'whiteboard', 'coffee', 'parking', 'air_conditioning',
  'lockers', 'natural_light', 'soundproofing', 'pro_lighting', 'vocal_booth',
  'green_screen', 'drum_kit', 'amplifier', 'microphone', 'mixing_console'
];

async function seed() {
  console.log('Clearing previous data...');
  await prisma.bookingPenalty.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.spaceAmenity.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.spaceBlock.deleteMany();
  await prisma.spacePhoto.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating amenities...');
  const amenityIds: Record<string, number> = {};
  for (const name of AMENITY_NAMES) {
    const amenity = await prisma.amenity.create({ data: { name } });
    amenityIds[name] = amenity.id;
  }

  console.log('Creating test users...');
  const passwordHash = await bcrypt.hash('password123', 12);

  await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'WSPACE',
      email: 'admin@wspace.com',
      passwordHash,
      phone: '3000000000',
      systemRole: 'admin'
    }
  });

  const ana = await prisma.user.create({
    data: {
      firstName: 'Ana',
      lastName: 'Torres',
      email: 'ana@example.com',
      passwordHash,
      phone: '3001234567'
    }
  });

  const laura = await prisma.user.create({
    data: {
      firstName: 'Laura',
      lastName: 'Gómez',
      email: 'laura@example.com',
      passwordHash,
      phone: '3002223344'
    }
  });

  const juan = await prisma.user.create({
    data: {
      firstName: 'Juan',
      lastName: 'Ramírez',
      email: 'juan@example.com',
      passwordHash,
      phone: '3009998877'
    }
  });

  const carlos = await prisma.user.create({
    data: {
      firstName: 'Carlos',
      lastName: 'Pérez',
      email: 'carlos@example.com',
      passwordHash,
      phone: '3007654321',
      isHost: true,
      // Publishing now requires these on file (see spacesController.
      // createSpace) — seeded here so the test account can still publish
      // new spaces during a demo without going through the upload flow.
      nationalId: '1000000001',
      nationalIdDocUrl: 'https://images.unsplash.com/photo-1633613286991-611fe299c4be?w=400',
      bankCertificateUrl: 'https://images.unsplash.com/photo-1633613286991-611fe299c4be?w=400'
    }
  });

  console.log('Creating test spaces...');

  interface SeedSpace {
    name: string;
    type: 'private_office' | 'meeting_room' | 'coworking' | 'creative_space' | 'rehearsal_room';
    city: string;
    neighborhood: string;
    capacity: number;
    pricePerHour: number;
    description: string;
    featured: boolean;
    photos: string[];
    amenities: string[];
  }

  async function createSpace(data: SeedSpace) {
    return prisma.space.create({
      data: {
        ownerId: carlos.id,
        name: data.name,
        type: data.type,
        city: data.city,
        neighborhood: data.neighborhood,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        description: data.description,
        featured: data.featured,
        // Seeded spaces are pre-approved so the app is usable right away
        // without needing to manually call the admin endpoints first.
        publicationStatus: 'approved',
        photos: { create: data.photos.map((url) => ({ url })) },
        amenities: { create: data.amenities.map((name) => ({ amenityId: amenityIds[name] })) }
      }
    });
  }

  const oficina = await createSpace({
    name: 'Oficina ejecutiva El Poblado',
    type: 'private_office',
    city: 'Medellín',
    neighborhood: 'El Poblado',
    capacity: 4,
    pricePerHour: 45000,
    description: 'Oficina privada, luminosa, ideal para reuniones de trabajo.',
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800'
    ],
    amenities: ['wifi', 'projector', 'coffee', 'air_conditioning']
  });

  const rockRoom = await createSpace({
    name: 'Sala de ensayo Rock Room',
    type: 'rehearsal_room',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    capacity: 5,
    pricePerHour: 35000,
    description: 'Sala insonorizada con batería y amplificadores incluidos.',
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'
    ],
    amenities: ['drum_kit', 'amplifier', 'microphone', 'soundproofing']
  });

  const coworking = await createSpace({
    name: 'Coworking Centro',
    type: 'coworking',
    city: 'Barranquilla',
    neighborhood: 'Centro',
    capacity: 1,
    pricePerHour: 12000,
    description: 'Escritorio flexible con wifi de alta velocidad.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800'
    ],
    amenities: ['wifi', 'coffee', 'natural_light']
  });

  // 7 more spaces (all owned by carlos, the only WSpacer+ seeded), rounding
  // out the set to 2 spaces per category (private_office, meeting_room,
  // coworking, creative_space, rehearsal_room). Photo URLs verified one by
  // one against the real Unsplash CDN (HTTP 200) before being added here.
  await createSpace({
    name: 'Sala de juntas Bogotá Chicó',
    type: 'meeting_room',
    city: 'Bogotá',
    neighborhood: 'Chicó',
    capacity: 8,
    pricePerHour: 40000,
    description: 'Sala de juntas profesional con proyector y pizarra, ideal para presentaciones y reuniones de equipo.',
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800'
    ],
    amenities: ['wifi', 'projector', 'whiteboard', 'coffee', 'air_conditioning']
  });

  await createSpace({
    name: 'Sala de juntas Cali Norte',
    type: 'meeting_room',
    city: 'Cali',
    neighborhood: 'Norte',
    capacity: 6,
    pricePerHour: 32000,
    description: 'Sala de reuniones moderna con pantalla y buena iluminación natural.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1560264280-88b68371db39?w=800',
      'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800'
    ],
    amenities: ['wifi', 'projector', 'natural_light', 'coffee']
  });

  await createSpace({
    name: 'Estudio fotográfico Laureles',
    type: 'creative_space',
    city: 'Medellín',
    neighborhood: 'Laureles',
    capacity: 6,
    pricePerHour: 38000,
    description: 'Estudio fotográfico con fondo infinito y luces profesionales, ideal para sesiones de fotos y video.',
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1533228876829-65c94e7b5025?w=800',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800'
    ],
    amenities: ['pro_lighting', 'green_screen', 'wifi', 'natural_light']
  });

  await createSpace({
    name: 'Taller de diseño Envigado',
    type: 'creative_space',
    city: 'Envigado',
    neighborhood: 'Zona Rosa',
    capacity: 4,
    pricePerHour: 28000,
    description: 'Taller amplio para talleres de diseño, pintura o manualidades, con buena luz natural.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
      'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800'
    ],
    amenities: ['natural_light', 'wifi', 'whiteboard', 'parking']
  });

  await createSpace({
    name: 'Sala de ensayo Getsemaní',
    type: 'rehearsal_room',
    city: 'Cartagena',
    neighborhood: 'Getsemaní',
    capacity: 4,
    pricePerHour: 30000,
    description: 'Sala de ensayo compacta e insonorizada, ideal para bandas pequeñas o solistas.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800',
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
      'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800'
    ],
    amenities: ['soundproofing', 'amplifier', 'microphone', 'vocal_booth']
  });

  await createSpace({
    name: 'Coworking Chapinero Alto',
    type: 'coworking',
    city: 'Bogotá',
    neighborhood: 'Chapinero Alto',
    capacity: 1,
    pricePerHour: 15000,
    description: 'Puesto de coworking en zona de alta conectividad, ambiente colaborativo.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=800',
      'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800',
      'https://images.unsplash.com/photo-1552581234-26160f608093?w=800'
    ],
    amenities: ['wifi', 'coffee', 'lockers', 'air_conditioning']
  });

  await createSpace({
    name: 'Oficina ejecutiva Granada',
    type: 'private_office',
    city: 'Cali',
    neighborhood: 'Granada',
    capacity: 5,
    pricePerHour: 42000,
    description: 'Oficina privada equipada, cerca a la zona empresarial de Cali.',
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800'
    ],
    amenities: ['wifi', 'projector', 'coffee', 'parking', 'air_conditioning']
  });

  console.log('Creating test bookings...');

  interface SeedBooking {
    guestId: number;
    spaceId: number;
    pricePerHour: number;
    daysOffset: number;
    startTime: string;
    endTime: string;
    status: 'pending_approval' | 'confirmed' | 'rejected' | 'cancelled_by_guest' | 'cancelled_by_host' | 'completed';
    isFirstBooking: boolean;
    withPayment?: boolean;
  }

  async function createBooking(data: SeedBooking) {
    const { basePrice, guestFee, guestFeeTax, hostFee, hostFeeTax, total, hostNet } =
      calculateBookingFinancials(data.pricePerHour, 1, data.isFirstBooking);

    return prisma.booking.create({
      data: {
        spaceId: data.spaceId,
        userId: data.guestId,
        date: daysFromNow(data.daysOffset),
        startTime: data.startTime,
        endTime: data.endTime,
        basePrice,
        guestFee,
        guestFeeTax,
        hostFee,
        hostFeeTax,
        total,
        hostNet,
        usedFreeBooking: data.isFirstBooking,
        status: data.status,
        responseDeadline: new Date(Date.now() + RESPONSE_WINDOW_HOURS * 60 * 60 * 1000),
        paymentReference: data.withPayment ? `WSP-SEED-${data.spaceId}-${data.daysOffset}` : null
      }
    });
  }

  // Each guest's first booking here gets the welcome discount (one free
  // hour) — same rule as bookingsController.applyFirstBookingDiscount —
  // and freeBookingsUsed is bumped to match further down, so the live app
  // doesn't grant the discount a second time to these accounts.
  const booking1 = await createBooking({
    guestId: ana.id, spaceId: oficina.id, pricePerHour: 45000,
    daysOffset: -10, startTime: '10:00', endTime: '11:00',
    status: 'completed', isFirstBooking: true
  });

  const booking2 = await createBooking({
    guestId: ana.id, spaceId: rockRoom.id, pricePerHour: 35000,
    daysOffset: -8, startTime: '18:00', endTime: '19:00',
    status: 'completed', isFirstBooking: false
  });

  const booking3 = await createBooking({
    guestId: laura.id, spaceId: coworking.id, pricePerHour: 12000,
    daysOffset: -7, startTime: '09:00', endTime: '10:00',
    status: 'completed', isFirstBooking: true
  });

  await createBooking({
    guestId: juan.id, spaceId: rockRoom.id, pricePerHour: 35000,
    daysOffset: -6, startTime: '20:00', endTime: '21:00',
    status: 'completed', isFirstBooking: true
  });

  await createBooking({
    guestId: ana.id, spaceId: coworking.id, pricePerHour: 12000,
    daysOffset: -4, startTime: '14:00', endTime: '15:00',
    status: 'cancelled_by_guest', isFirstBooking: false
  });

  // Cancelled by the host with less than 24h of notice — gets the two
  // penalty rows below, same as hostCancelBooking() would create.
  const lateHostCancelBooking = await createBooking({
    guestId: laura.id, spaceId: oficina.id, pricePerHour: 45000,
    daysOffset: -3, startTime: '11:00', endTime: '12:00',
    status: 'cancelled_by_host', isFirstBooking: false
  });

  await createBooking({
    guestId: juan.id, spaceId: oficina.id, pricePerHour: 45000,
    daysOffset: -2, startTime: '15:00', endTime: '16:00',
    status: 'rejected', isFirstBooking: false
  });

  await createBooking({
    guestId: ana.id, spaceId: rockRoom.id, pricePerHour: 35000,
    daysOffset: 1, startTime: '17:00', endTime: '18:00',
    status: 'confirmed', isFirstBooking: false, withPayment: true
  });

  await createBooking({
    guestId: laura.id, spaceId: rockRoom.id, pricePerHour: 35000,
    daysOffset: 2, startTime: '19:00', endTime: '20:00',
    status: 'confirmed', isFirstBooking: false, withPayment: true
  });

  await createBooking({
    guestId: juan.id, spaceId: coworking.id, pricePerHour: 12000,
    daysOffset: 3, startTime: '10:00', endTime: '11:00',
    status: 'pending_approval', isFirstBooking: false
  });

  await createBooking({
    guestId: ana.id, spaceId: oficina.id, pricePerHour: 45000,
    daysOffset: 4, startTime: '09:00', endTime: '10:00',
    status: 'pending_approval', isFirstBooking: false
  });

  await createBooking({
    guestId: laura.id, spaceId: coworking.id, pricePerHour: 12000,
    daysOffset: 5, startTime: '13:00', endTime: '14:00',
    status: 'pending_approval', isFirstBooking: false
  });

  await createBooking({
    guestId: juan.id, spaceId: rockRoom.id, pricePerHour: 35000,
    daysOffset: 6, startTime: '16:00', endTime: '17:00',
    status: 'confirmed', isFirstBooking: false, withPayment: true
  });

  await createBooking({
    guestId: ana.id, spaceId: coworking.id, pricePerHour: 12000,
    daysOffset: 8, startTime: '11:00', endTime: '12:00',
    status: 'pending_approval', isFirstBooking: false
  });

  console.log('Creating penalty rows for the late host cancellation...');
  const lateCancelTotal = Number(lateHostCancelBooking.total);
  await prisma.bookingPenalty.createMany({
    data: [
      { bookingId: lateHostCancelBooking.id, type: 'host_penalty', amount: lateCancelTotal * HOST_LATE_CANCEL_PENALTY_RATE },
      { bookingId: lateHostCancelBooking.id, type: 'guest_compensation', amount: lateCancelTotal * HOST_LATE_CANCEL_COMPENSATION_RATE }
    ]
  });

  console.log('Marking each guest\'s free hour as used...');
  await prisma.user.update({ where: { id: ana.id }, data: { freeBookingsUsed: 1 } });
  await prisma.user.update({ where: { id: laura.id }, data: { freeBookingsUsed: 1 } });
  await prisma.user.update({ where: { id: juan.id }, data: { freeBookingsUsed: 1 } });

  console.log('Creating reviews...');
  // booking4 (Juan on Rock Room) is deliberately left without a review,
  // so there's still a "completed, unreviewed" booking to try the
  // leave-a-review form on (see myBookings.js:renderReviewSection).
  await prisma.review.create({
    data: { bookingId: booking1.id, spaceId: oficina.id, userId: ana.id, rating: 5, comment: 'Excelente oficina, muy cómoda y bien ubicada.' }
  });
  await prisma.review.create({
    data: { bookingId: booking2.id, spaceId: rockRoom.id, userId: ana.id, rating: 4, comment: 'Buena insonorización, faltó un micrófono extra.' }
  });
  await prisma.review.create({
    data: { bookingId: booking3.id, spaceId: coworking.id, userId: laura.id, rating: 5, comment: 'Wifi rápido y ambiente tranquilo para trabajar.' }
  });

  console.log('Creating favorites...');
  await prisma.favorite.create({ data: { userId: ana.id, spaceId: rockRoom.id } });
  await prisma.favorite.create({ data: { userId: ana.id, spaceId: coworking.id } });
  await prisma.favorite.create({ data: { userId: laura.id, spaceId: oficina.id } });

  console.log('Done! Test data created:');
  console.log('  - admin@wspace.com / password123 (admin)');
  console.log(`  - ana@example.com / password123 (WSpacer, id ${ana.id})`);
  console.log(`  - laura@example.com / password123 (WSpacer, id ${laura.id})`);
  console.log(`  - juan@example.com / password123 (WSpacer, id ${juan.id})`);
  console.log(`  - carlos@example.com / password123 (WSpacer+, owner of 10 spaces, id ${carlos.id})`);
  console.log('  - 10 spaces (2 per category), 14 bookings across all 6 statuses, 3 reviews, 3 favorites, 1 late-cancellation penalty pair');
}

seed()
  .catch((err) => {
    console.error('Error seeding the database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
