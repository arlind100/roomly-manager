import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RoomsSection } from '@/components/RoomsSection';
import { RestaurantSection } from '@/components/RestaurantSection';
import { AmenitiesSection } from '@/components/AmenitiesSection';
import { GallerySection } from '@/components/GallerySection';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { AboutSection } from '@/components/AboutSection';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <RoomsSection />
      <RestaurantSection />
      <AmenitiesSection />
      <GallerySection />
      <TestimonialsSection />
      <AboutSection />

      {/* CTA Block */}
      <section className="section-padding">
        <div className="container-luxury">
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-12 md:p-16 text-center">
              <span className="text-primary font-body text-sm tracking-[0.25em] uppercase mb-4 block">Begin Your Journey</span>
              <h2 className="font-display text-3xl md:text-5xl font-semibold mb-4">
                Your Extraordinary Stay Awaits
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Reserve your experience at Aurelia Grand and discover a world where luxury knows no bounds.
              </p>
              <Link to="/booking">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 px-12 py-6 text-base font-body tracking-wide">
                  Book Your Stay
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
