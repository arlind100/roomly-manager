import { useEffect, useRef, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const ScrollReveal = ({ children, className = '', delay = 0 }: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const SectionHeading = ({ label, title, description }: { label: string; title: string; description?: string }) => (
  <ScrollReveal className="text-center mb-16">
    <span className="text-primary font-body text-sm tracking-[0.25em] uppercase mb-4 block">{label}</span>
    <h2 className="font-display text-3xl md:text-5xl font-semibold mb-4">{title}</h2>
    {description && <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{description}</p>}
    <div className="divider-gold w-24 mx-auto mt-6" />
  </ScrollReveal>
);
