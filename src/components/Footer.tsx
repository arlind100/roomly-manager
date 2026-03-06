import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-border py-16 px-4">
      <div className="container-luxury">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link to="/" className="inline-block mb-4">
              <span className="font-display text-xl font-semibold text-gradient-gold">Aurelia</span>{' '}
              <span className="font-display text-xl font-light text-foreground">Grand</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Five-star luxury on the Mediterranean coast. Where timeless elegance meets modern sophistication.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Rooms & Suites</button></li>
              <li><button onClick={() => document.getElementById('restaurant')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Restaurant</button></li>
              <li><button onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Amenities</button></li>
              <li><button onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Gallery</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-medium mb-4">Guest Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/booking" className="hover:text-primary transition-colors">Book a Room</Link></li>
              <li><Link to="/restaurant" className="hover:text-primary transition-colors">Restaurant Reservation</Link></li>
              <li><button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Contact Us</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-medium mb-4">Contact</h4>
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
          <p>© 2026 Aurelia Grand. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
