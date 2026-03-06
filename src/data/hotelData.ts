export interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  size: string;
  image: string;
  amenities: string[];
}

export interface Reservation {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  specialRequests?: string;
}

export interface BlockedDate {
  roomId: string;
  date: string;
}

export const rooms: Room[] = [
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    description: 'Elegant comfort with premium furnishings, marble bath, and city views.',
    price: 450,
    capacity: 2,
    size: '45 m²',
    image: 'room-deluxe',
    amenities: ['King Bed', 'City View', 'Marble Bath', 'Mini Bar', 'Room Service'],
  },
  {
    id: 'suite',
    name: 'Grand Suite',
    description: 'Expansive oceanfront suite with separate living area and panoramic views.',
    price: 850,
    capacity: 3,
    size: '78 m²',
    image: 'room-suite',
    amenities: ['King Bed', 'Ocean View', 'Living Room', 'Butler Service', 'Private Terrace'],
  },
  {
    id: 'penthouse',
    name: 'Presidential Penthouse',
    description: 'The pinnacle of luxury — a private penthouse with skyline panorama and bespoke service.',
    price: 2200,
    capacity: 4,
    size: '150 m²',
    image: 'room-penthouse',
    amenities: ['Master Suite', '360° Views', 'Private Dining', 'Personal Chef', 'Chauffeur'],
  },
];

export const menuItems = [
  { name: 'Wagyu Tartare', description: 'Hand-cut A5 wagyu, truffle emulsion, quail egg yolk', price: 68 },
  { name: 'Lobster Bisque', description: 'Maine lobster, saffron cream, cognac reduction', price: 45 },
  { name: 'Pan-Seared Foie Gras', description: 'Fig compote, brioche, port wine reduction', price: 52 },
  { name: 'Grilled Dover Sole', description: 'Brown butter, capers, lemon, seasonal vegetables', price: 88 },
  { name: 'Dry-Aged Ribeye', description: '45-day aged prime beef, bone marrow jus, truffle fries', price: 120 },
  { name: 'Chocolate Soufflé', description: 'Valrhona chocolate, crème anglaise, gold leaf', price: 32 },
];

export const testimonials = [
  {
    name: 'Alexandra Whitfield',
    role: 'Travel Editor, Condé Nast',
    text: 'Aurelia Grand redefines what luxury hospitality means. Every detail is crafted to perfection — from the breathtaking suites to the impeccable service.',
    rating: 5,
  },
  {
    name: 'James Chen',
    role: 'CEO, Atlas Ventures',
    text: 'My family and I have stayed at the finest hotels worldwide. Aurelia Grand stands alone in its class. The penthouse experience was nothing short of extraordinary.',
    rating: 5,
  },
  {
    name: 'Sophie Laurent',
    role: 'Michelin Guide Inspector',
    text: 'The restaurant alone is worth the journey. Chef Laurent\'s tasting menu is a masterpiece of culinary artistry that rivals the best in Paris.',
    rating: 5,
  },
];

export const amenitiesList = [
  { icon: 'Waves', title: 'Infinity Pool', description: 'Oceanfront infinity pool with cabana service' },
  { icon: 'Sparkles', title: 'Luxury Spa', description: 'Full-service spa with signature treatments' },
  { icon: 'Dumbbell', title: 'Fitness Center', description: 'State-of-the-art equipment and personal trainers' },
  { icon: 'Wine', title: 'Wine Cellar', description: 'Curated collection of 500+ fine wines' },
  { icon: 'Car', title: 'Valet & Chauffeur', description: 'Complimentary valet and luxury transfers' },
  { icon: 'Gem', title: 'Concierge', description: '24/7 bespoke concierge services' },
];

// Helper to manage reservations in localStorage
const STORAGE_KEY = 'aurelia_reservations';
const BLOCKED_KEY = 'aurelia_blocked_dates';

export function getReservations(): Reservation[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveReservation(reservation: Reservation): void {
  const all = getReservations();
  all.push(reservation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function updateReservation(id: string, updates: Partial<Reservation>): void {
  const all = getReservations().map(r => r.id === id ? { ...r, ...updates } : r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getBlockedDates(): BlockedDate[] {
  const data = localStorage.getItem(BLOCKED_KEY);
  return data ? JSON.parse(data) : [];
}

export function toggleBlockedDate(roomId: string, date: string): void {
  let blocked = getBlockedDates();
  const exists = blocked.find(b => b.roomId === roomId && b.date === date);
  if (exists) {
    blocked = blocked.filter(b => !(b.roomId === roomId && b.date === date));
  } else {
    blocked.push({ roomId, date });
  }
  localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
}

export function isDateAvailable(roomId: string, date: string): boolean {
  const blocked = getBlockedDates();
  if (blocked.some(b => b.roomId === roomId && b.date === date)) return false;
  const reservations = getReservations().filter(r => r.roomId === roomId && r.status !== 'cancelled');
  return !reservations.some(r => date >= r.checkIn && date < r.checkOut);
}

export function isRangeAvailable(roomId: string, checkIn: string, checkOut: string): boolean {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (!isDateAvailable(roomId, dateStr)) return false;
  }
  return true;
}
