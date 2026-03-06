import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { amenitiesList } from '@/data/hotelData';
import { Waves, Sparkles, Dumbbell, Wine, Car, Gem } from 'lucide-react';
import spaImg from '@/assets/spa-pool.jpg';

const iconMap: Record<string, any> = { Waves, Sparkles, Dumbbell, Wine, Car, Gem };

export const AmenitiesSection = () => {
  return (
    <section id="amenities" className="section-padding bg-gradient-dark">
      <div className="container-luxury">
        <SectionHeading
          label="Services"
          title="World-Class Amenities"
          description="Every moment of your stay is elevated with our curated selection of premium services."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <div className="grid grid-cols-2 gap-4">
              {amenitiesList.map((item, i) => {
                const Icon = iconMap[item.icon];
                return (
                  <div key={item.title} className="glass-card rounded-xl p-5 hover:shadow-gold transition-all duration-300 group">
                    <Icon size={28} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-display text-base font-medium mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="relative rounded-xl overflow-hidden shadow-luxury">
              <img src={spaImg} alt="Infinity pool at sunset" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-primary text-sm tracking-[0.2em] uppercase">Spa & Wellness</span>
                <h3 className="font-display text-2xl font-semibold mt-2">Rejuvenate Your Senses</h3>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
