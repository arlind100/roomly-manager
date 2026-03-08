import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import heroImg from '@/assets/hero-hotel.jpg';

export const Hero = () => {
  const { t } = useLanguage();
  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Aurelia Grand luxury hotel exterior at golden hour" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
      </div>
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="inline-block text-primary font-body text-sm tracking-[0.3em] uppercase mb-6">
          {t('hero.subtitle')}
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold mb-6 leading-[1.1]">
          <span className="text-gradient-gold">Aurelia</span> <span className="text-foreground">Grand</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-lg md:text-xl text-secondary-foreground max-w-2xl mx-auto mb-10 font-light">
          {t('hero.description')}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/booking"><Button size="lg" className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-body tracking-wide">{t('hero.bookStay')}</Button></Link>
          <Button size="lg" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10 px-10 py-6 text-base font-body tracking-wide" onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })}>{t('hero.exploreRooms')}</Button>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-6 h-10 rounded-full border-2 border-primary/40 flex items-start justify-center pt-2">
          <div className="w-1 h-2 bg-primary rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};
