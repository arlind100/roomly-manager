import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { useEffect, useRef, useState } from 'react';
import lobbyImg from '@/assets/gallery-lobby.jpg';

const Counter = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, end]);

  return <div ref={ref} className="font-display text-4xl md:text-5xl font-semibold text-gradient-gold">{count}{suffix}</div>;
};

export const AboutSection = () => {
  return (
    <section id="about" className="section-padding">
      <div className="container-luxury">
        <SectionHeading label="Our Story" title="About Aurelia Grand" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <ScrollReveal>
            <div className="relative rounded-xl overflow-hidden shadow-luxury">
              <img src={lobbyImg} alt="Hotel grand lobby" className="w-full h-[400px] object-cover" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="space-y-5">
              <p className="text-secondary-foreground leading-relaxed">
                Founded in 1987 on the sun-kissed shores of the Mediterranean, Aurelia Grand has been 
                the epitome of refined hospitality for over three decades. Our heritage blends classical 
                European elegance with contemporary luxury.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Every detail — from the hand-selected Italian marble in our lobby to the bespoke 
                amenities in each suite — reflects our unwavering commitment to excellence. We don't 
                just host guests; we create unforgettable experiences.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our team of over 200 dedicated professionals ensures that every moment of your stay 
                exceeds the highest expectations of luxury hospitality.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 35, suffix: '+', label: 'Years of Excellence' },
            { value: 120, suffix: '', label: 'Luxury Rooms & Suites' },
            { value: 98, suffix: '%', label: 'Guest Satisfaction' },
            { value: 15, suffix: '', label: 'International Awards' },
          ].map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.1}>
              <div className="text-center glass-card rounded-xl p-6">
                <Counter end={stat.value} suffix={stat.suffix} />
                <p className="text-muted-foreground text-sm mt-2">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
