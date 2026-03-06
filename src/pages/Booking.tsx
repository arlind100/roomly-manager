import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rooms, isRangeAvailable, saveReservation, Reservation } from '@/data/hotelData';
import { format } from 'date-fns';
import { CalendarIcon, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomPenthouse from '@/assets/room-penthouse.jpg';

const roomImages: Record<string, string> = {
  deluxe: roomDeluxe,
  suite: roomSuite,
  penthouse: roomPenthouse,
};

const Booking = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(searchParams.get('room') || '');
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const room = rooms.find(r => r.id === selectedRoom);
  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const available = useMemo(() => {
    if (!selectedRoom || !checkIn || !checkOut || nights <= 0) return null;
    return isRangeAvailable(selectedRoom, checkIn.toISOString().split('T')[0], checkOut.toISOString().split('T')[0]);
  }, [selectedRoom, checkIn, checkOut, nights]);

  const canProceedStep1 = selectedRoom && checkIn && checkOut && nights > 0 && available;

  const handleSubmit = () => {
    if (!room || !checkIn || !checkOut) return;

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      roomId: selectedRoom,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      guests: parseInt(guests),
      status: 'pending',
      createdAt: new Date().toISOString(),
      specialRequests,
    };

    saveReservation(reservation);
    setSubmitted(true);
    toast.success('Reservation submitted successfully!');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center glass-card rounded-2xl p-12"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-primary" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-3">Reservation Submitted</h2>
            <p className="text-muted-foreground mb-2">
              Thank you, {name}! Your reservation for the <strong>{room?.name}</strong> has been received.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              {checkIn && format(checkIn, 'MMM dd, yyyy')} — {checkOut && format(checkOut, 'MMM dd, yyyy')} · {nights} night{nights > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              Status: <span className="text-primary font-medium">Pending</span> — We'll confirm your booking within 24 hours.
            </p>
            <Link to="/">
              <Button className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">
                Return Home
              </Button>
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-4">
        <div className="container-luxury max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 text-sm">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">Book Your Stay</h1>
          <p className="text-muted-foreground mb-10">Select your room, dates, and complete your reservation.</p>

          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-10">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  step >= s ? 'bg-gradient-gold text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {step > s ? <Check size={16} /> : s}
                </div>
                <span className="text-sm hidden sm:inline">{s === 1 ? 'Room & Dates' : 'Guest Details'}</span>
                {s < 2 && <div className={cn('w-12 h-px', step > 1 ? 'bg-primary' : 'bg-border')} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              {/* Room selection */}
              <div>
                <label className="font-display text-lg font-medium block mb-4">Select Room</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rooms.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoom(r.id)}
                      className={cn(
                        'glass-card rounded-xl overflow-hidden text-left transition-all duration-300',
                        selectedRoom === r.id ? 'ring-2 ring-primary shadow-gold' : 'hover:shadow-gold/50'
                      )}
                    >
                      <img src={roomImages[r.id]} alt={r.name} className="w-full h-32 object-cover" />
                      <div className="p-4">
                        <h4 className="font-display text-sm font-medium">{r.name}</h4>
                        <p className="text-primary text-sm font-semibold mt-1">${r.price}/night</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Check-in Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-muted/50', !checkIn && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkIn}
                        onSelect={setCheckIn}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Check-out Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-muted/50', !checkOut && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkOut}
                        onSelect={setCheckOut}
                        disabled={(date) => date <= (checkIn || new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Number of Guests</label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger className="w-full sm:w-48 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} Guest{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability status */}
              {available !== null && (
                <div className={cn(
                  'glass-card rounded-xl p-4 flex items-center gap-3',
                  available ? 'border-primary/30' : 'border-destructive/30'
                )}>
                  {available ? (
                    <>
                      <Check className="text-primary" size={20} />
                      <div>
                        <p className="text-sm font-medium">Available!</p>
                        <p className="text-xs text-muted-foreground">
                          {room?.name} · {nights} night{nights > 1 ? 's' : ''} · Total: ${room ? room.price * nights : 0}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-destructive" size={20} />
                      <div>
                        <p className="text-sm font-medium text-destructive">Not Available</p>
                        <p className="text-xs text-muted-foreground">These dates are unavailable. Please try different dates.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide px-8"
              >
                Continue to Guest Details
              </Button>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="glass-card rounded-xl p-6 mb-6">
                <h3 className="font-display text-lg font-medium mb-2">Booking Summary</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">{room?.name}</strong></p>
                  <p>{checkIn && format(checkIn, 'MMM dd, yyyy')} — {checkOut && format(checkOut, 'MMM dd, yyyy')}</p>
                  <p>{nights} night{nights > 1 ? 's' : ''} · {guests} guest{parseInt(guests) > 1 ? 's' : ''}</p>
                  <p className="text-primary font-semibold text-lg mt-2">Total: ${room ? room.price * nights : 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Full Name *</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="bg-muted/50" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email *</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="bg-muted/50" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone *</label>
                <Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-muted/50" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Special Requests</label>
                <Textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Any special requirements..." rows={4} className="bg-muted/50 resize-none" />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="font-body">
                  Back
                </Button>
                <Button
                  disabled={!name || !email || !phone}
                  onClick={handleSubmit}
                  className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide px-8"
                >
                  Submit Reservation
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Booking;
