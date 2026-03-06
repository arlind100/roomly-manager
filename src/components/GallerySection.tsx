import { useState } from 'react';
import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { motion, AnimatePresence } from 'framer-motion';
import heroImg from '@/assets/hero-hotel.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import restaurantImg from '@/assets/restaurant.jpg';
import spaImg from '@/assets/spa-pool.jpg';
import lobbyImg from '@/assets/gallery-lobby.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';

const images = [
  { src: heroImg, alt: 'Hotel exterior', category: 'Hotel' },
  { src: lobbyImg, alt: 'Grand lobby', category: 'Hotel' },
  { src: roomSuite, alt: 'Grand Suite', category: 'Rooms' },
  { src: roomDeluxe, alt: 'Deluxe Room', category: 'Rooms' },
  { src: restaurantImg, alt: 'Restaurant Lumière', category: 'Dining' },
  { src: spaImg, alt: 'Infinity pool', category: 'Spa' },
];

const categories = ['All', 'Hotel', 'Rooms', 'Dining', 'Spa'];

export const GallerySection = () => {
  const [active, setActive] = useState('All');
  const filtered = active === 'All' ? images : images.filter(i => i.category === active);

  return (
    <section id="gallery" className="section-padding">
      <div className="container-luxury">
        <SectionHeading label="Gallery" title="A Visual Journey" />

        <ScrollReveal>
          <div className="flex justify-center gap-3 mb-10 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-5 py-2 rounded-full text-sm font-body transition-all duration-300 ${
                  active === cat
                    ? 'bg-gradient-gold text-primary-foreground'
                    : 'glass text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((img, i) => (
              <motion.div
                key={img.alt}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-xl overflow-hidden aspect-[4/3] group cursor-pointer"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all duration-300 flex items-end">
                  <span className="p-4 font-display text-sm opacity-0 group-hover:opacity-100 transition-opacity">{img.alt}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
