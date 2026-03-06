import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { testimonials } from '@/data/hotelData';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="section-padding bg-gradient-dark">
      <div className="container-luxury">
        <SectionHeading
          label="Guest Reviews"
          title="What Our Guests Say"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 0.15}>
              <div className="glass-card rounded-xl p-8 h-full flex flex-col">
                <Quote size={28} className="text-primary/40 mb-4" />
                <p className="text-secondary-foreground text-sm leading-relaxed flex-1 italic font-light">
                  "{t.text}"
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={14} className="fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="font-display font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
