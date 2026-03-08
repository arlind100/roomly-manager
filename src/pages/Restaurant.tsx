import { useState } from 'react';
import { usePublicTheme } from '@/hooks/useAdminTheme';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { menuItems } from '@/data/hotelData';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import restaurantImg from '@/assets/restaurant.jpg';
import dishImg from '@/assets/dish.jpg';

const Restaurant = () => {
  usePublicTheme();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Table reservation submitted! We\'ll confirm your booking shortly.');
    setDate(undefined); setTime(''); setName(''); setEmail('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <img src={restaurantImg} alt="Restaurant Lumière" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/60" />
        <div className="relative text-center px-4">
          <span className="text-primary font-body text-sm tracking-[0.25em] uppercase block mb-4">Fine Dining</span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold mb-3">Restaurant Lumière</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">One Michelin Star · Mediterranean Haute Cuisine</p>
        </div>
      </section>

      {/* Menu */}
      <section className="section-padding">
        <div className="container-luxury max-w-4xl">
          <SectionHeading label="Our Menu" title="Chef's Selection" description="A curated journey through the finest Mediterranean flavors." />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {menuItems.map(item => (
              <ScrollReveal key={item.name}>
                <div className="glass-card rounded-xl p-5 flex justify-between items-start">
                  <div>
                    <h4 className="font-display font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <span className="text-primary font-semibold ml-4">${item.price}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="relative rounded-xl overflow-hidden h-64 mb-16">
              <img src={dishImg} alt="Signature dish" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent flex items-center">
                <div className="p-8">
                  <h3 className="font-display text-2xl font-semibold mb-2">Tasting Menu</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">Seven courses of seasonal artistry. Available nightly with wine pairing.</p>
                  <p className="text-primary font-semibold mt-2">$280 per person</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Reservation */}
          <SectionHeading label="Reserve" title="Book a Table" />

          <ScrollReveal>
            <form onSubmit={handleReserve} className="glass-card rounded-xl p-8 max-w-xl mx-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Name</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-muted/50" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-muted/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-muted/50', !date && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'MMM dd') : 'Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Time</label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Time" /></SelectTrigger>
                    <SelectContent>
                      {['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Party Size</label>
                  <Select value={partySize} onValueChange={setPartySize}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} Guest{n > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!date || !time || !name || !email}
                className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide"
              >
                Reserve Table
              </Button>
            </form>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Restaurant;
