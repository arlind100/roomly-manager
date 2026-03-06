import { Link } from 'react-router-dom';
import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { rooms } from '@/data/hotelData';
import { Users, Maximize } from 'lucide-react';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomPenthouse from '@/assets/room-penthouse.jpg';

const roomImages: Record<string, string> = {
  'room-deluxe': roomDeluxe,
  'room-suite': roomSuite,
  'room-penthouse': roomPenthouse,
};

export const RoomsSection = () => {
  return (
    <section id="rooms" className="section-padding bg-gradient-dark">
      <div className="container-luxury">
        <SectionHeading
          label="Accommodations"
          title="Rooms & Suites"
          description="Each room is a sanctuary of refined taste, designed for guests who appreciate the extraordinary."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room, i) => (
            <ScrollReveal key={room.id} delay={i * 0.15}>
              <div className="glass-card rounded-xl overflow-hidden group hover:shadow-gold transition-all duration-500">
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={roomImages[room.image]}
                    alt={room.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <span className="font-display text-xl font-semibold">{room.name}</span>
                    <span className="text-primary font-semibold text-lg">
                      ${room.price}<span className="text-sm text-muted-foreground">/night</span>
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{room.description}</p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users size={14} /> {room.capacity} Guests</span>
                    <span className="flex items-center gap-1"><Maximize size={14} /> {room.size}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {room.amenities.slice(0, 3).map(a => (
                      <span key={a} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{a}</span>
                    ))}
                  </div>

                  <Link to={`/booking?room=${room.id}`}>
                    <Button className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body text-sm tracking-wide">
                      Reserve This Room
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
