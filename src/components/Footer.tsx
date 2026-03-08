import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

export const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border py-16 px-4">
      <div className="container-luxury">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link to="/" className="inline-block mb-4">
              <span className="font-display text-xl font-semibold text-gradient-gold">Aurelia</span>{' '}
              <span className="font-display text-xl font-light text-foreground">Grand</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="font-display text-sm font-medium mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">{t('nav.rooms')}</button></li>
              <li><button onClick={() => document.getElementById('restaurant')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">{t('nav.dining')}</button></li>
              <li><button onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">{t('nav.amenities')}</button></li>
              <li><button onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">{t('nav.gallery')}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-medium mb-4">{t('footer.guestServices')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/booking" className="hover:text-primary transition-colors">{t('footer.bookRoom')}</Link></li>
              <li><Link to="/restaurant" className="hover:text-primary transition-colors">{t('footer.restaurantRes')}</Link></li>
              <li><button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">{t('footer.contactUs')}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-medium mb-4">{t('footer.contactLabel')}</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>42 Promenade des Anglais</p>
              <p>Côte d'Azur, France 06000</p>
              <p>+33 (0)4 93 00 00 00</p>
              <p>reservations@aureliagrand.com</p>
            </div>
          </div>
        </div>
        <div className="divider-gold mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>{t('footer.rights')}</p>
          <div className="flex gap-6">
            <span className="hover:text-primary cursor-pointer transition-colors">{t('footer.privacy')}</span>
            <span className="hover:text-primary cursor-pointer transition-colors">{t('footer.terms')}</span>
            <span className="hover:text-primary cursor-pointer transition-colors">{t('footer.cookies')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
