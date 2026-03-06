import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { menuItems } from '@/data/hotelData';
import { Link } from 'react-router-dom';
import restaurantImg from '@/assets/restaurant.jpg';
import dishImg from '@/assets/dish.jpg';

export const RestaurantSection = () => {
  return (
    <section id="restaurant" className="section-padding">
      <div className="container-luxury">
        <SectionHeading
          label="Fine Dining"
          title="Restaurant Lumière"
          description="A gastronomic journey curated by Chef Laurent, blending Mediterranean tradition with avant-garde technique."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <ScrollReveal>
            <div className="relative rounded-xl overflow-hidden shadow-luxury">
              <img src={restaurantImg} alt="Restaurant Lumière interior" className="w-full h-80 lg:h-[450px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="space-y-6">
              <h3 className="font-display text-2xl font-semibold text-gradient-gold">Chef's Tasting Menu</h3>
              <p className="text-muted-foreground leading-relaxed">
                Experience a seven-course culinary masterpiece featuring the finest seasonal ingredients 
                sourced from local artisans and the Mediterranean coastline.
              </p>
              
              <div className="relative rounded-xl overflow-hidden mb-6">
                <img src={dishImg} alt="Signature dish" className="w-full h-48 object-cover rounded-xl" />
              </div>

              <div className="space-y-3">
                {menuItems.slice(0, 4).map((item) => (
                  <div key={item.name} className="glass-card rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-display text-sm font-medium">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <span className="text-primary font-semibold text-sm ml-4">${item.price}</span>
                  </div>
                ))}
              </div>

              <Link to="/restaurant">
                <Button className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide mt-4">
                  View Full Menu & Reserve
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
