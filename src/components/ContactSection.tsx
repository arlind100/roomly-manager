import { ScrollReveal, SectionHeading } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const ContactSection = () => {
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success('Message sent successfully! We will respond within 24 hours.');
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <section id="contact" className="section-padding bg-gradient-dark">
      <div className="container-luxury">
        <SectionHeading label="Get in Touch" title="Contact Us" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ScrollReveal>
            <div className="space-y-8">
              {[
                { icon: MapPin, title: 'Location', text: '42 Promenade des Anglais\nCôte d\'Azur, France 06000' },
                { icon: Phone, title: 'Phone', text: '+33 (0)4 93 00 00 00' },
                { icon: Mail, title: 'Email', text: 'reservations@aureliagrand.com' },
                { icon: Clock, title: 'Reception', text: '24 hours, 7 days a week' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <item.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-medium mb-1">{item.title}</h4>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">{item.text}</p>
                  </div>
                </div>
              ))}

              {/* Map placeholder */}
              <div className="glass-card rounded-xl h-48 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Interactive Map</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
                  <Input required placeholder="John Doe" className="bg-muted/50 border-border" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                  <Input required type="email" placeholder="john@example.com" className="bg-muted/50 border-border" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Subject</label>
                <Input required placeholder="Inquiry about..." className="bg-muted/50 border-border" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Message</label>
                <Textarea required placeholder="Your message..." rows={5} className="bg-muted/50 border-border resize-none" />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
