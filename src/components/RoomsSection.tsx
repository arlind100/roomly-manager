import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { formatCurrency } from '@/lib/currency';
import { Users, Maximize, Loader2 } from 'lucide-react';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomPenthouse from '@/assets/room-penthouse.jpg';

const fallbackImages: Record<string, string> = { 'Deluxe Room': roomDeluxe, 'Grand Suite': roomSuite, 'Presidential Penthouse': roomPenthouse };

export const RoomsSection = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('room_types').select('*').eq('show_on_website', true).order('base_price')
      .then(({ data }) => { setRooms(data || []); setLoading(false); });
  }, []);

  const getRoomImage = (rt: any) => {
    if (rt.image_url && rt.image_url.startsWith('http')) return rt.image_url;
    return fallbackImages[rt.name] || roomDeluxe;
  };

  return (
    <section id="rooms" className="section-padding bg-gradient-dark">
      <div className="container-luxury">
        <SectionHeading label={t('rooms.label')} title={t('rooms.title')} description={t('rooms.description')} />
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('rooms.noRooms')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room, i) => (
              <ScrollReveal key={room.id} delay={i * 0.15}>
                <div className="glass-card rounded-xl overflow-hidden group hover:shadow-gold transition-all duration-500">
                  <div className="relative h-64 overflow-hidden">
                    <img src={getRoomImage(room)} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <span className="font-display text-xl font-semibold">{room.name}</span>
                      <span className="text-primary font-semibold text-lg">{formatCurrency(Number(room.base_price), cur)}<span className="text-sm text-muted-foreground">{t('rooms.perNight')}</span></span>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{room.description}</p>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={14} /> {room.max_guests} {t('rooms.guests')}</span>
                      {room.room_size && <span className="flex items-center gap-1"><Maximize size={14} /> {room.room_size}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(room.amenities || []).slice(0, 3).map((a: string) => <span key={a} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{a}</span>)}
                    </div>
                    <Link to={`/booking?room=${room.id}`}>
                      <Button className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body text-sm tracking-wide">{t('rooms.reserveRoom')}</Button>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
