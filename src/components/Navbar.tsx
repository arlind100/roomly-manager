import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

export const Navbar = () => {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: t('nav.rooms'), href: '/#rooms' },
    { label: t('nav.dining'), href: '/#restaurant' },
    { label: t('nav.amenities'), href: '/#amenities' },
    { label: t('nav.gallery'), href: '/#gallery' },
    { label: t('nav.about'), href: '/#about' },
    { label: t('nav.contact'), href: '/#contact' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      if (location.pathname === '/') { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
      else { window.location.href = href; }
    }
  };

  return (
    <>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-strong py-3' : 'py-5 bg-transparent'}`}>
        <div className="container-luxury flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold text-gradient-gold">Aurelia</span>
            <span className="font-display text-2xl font-light text-foreground">Grand</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map(item => (
              <button key={item.label} onClick={() => handleNavClick(item.href)} className="text-sm text-secondary-foreground hover:text-primary transition-colors tracking-wide">{item.label}</button>
            ))}
            <Link to="/booking">
              <Button className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 px-6 font-body text-sm tracking-wide">{t('nav.reserveNow')}</Button>
            </Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-foreground">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-40 glass-strong pt-24">
            <div className="flex flex-col items-center gap-6 py-8">
              {navItems.map(item => (
                <button key={item.label} onClick={() => handleNavClick(item.href)} className="font-display text-xl text-foreground hover:text-primary transition-colors">{item.label}</button>
              ))}
              <Link to="/booking" onClick={() => setMobileOpen(false)}>
                <Button className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 px-8 mt-4 font-body">{t('nav.reserveNow')}</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
