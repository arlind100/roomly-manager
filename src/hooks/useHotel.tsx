import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchExchangeRates } from '@/lib/currency';

interface HotelContextType {
  hotel: any;
  loading: boolean;
  refetch: () => void;
}

const HotelContext = createContext<HotelContextType>({ hotel: null, loading: true, refetch: () => {} });

export function HotelProvider({ children }: { children: ReactNode }) {
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHotel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('hotel_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!roles || roles.length === 0 || !roles[0].hotel_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', roles[0].hotel_id)
      .single();

    setHotel(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHotel();
    fetchExchangeRates();
  }, []);

  return (
    <HotelContext.Provider value={{ hotel, loading, refetch: fetchHotel }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  return useContext(HotelContext);
}
