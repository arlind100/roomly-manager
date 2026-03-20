import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchExchangeRates } from '@/lib/currency';

export function useHotel() {
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotel = async () => {
      // First get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get hotel_id from user_roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('hotel_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!roles || roles.length === 0 || !roles[0].hotel_id) {
        setLoading(false);
        return;
      }

      const hotelId = roles[0].hotel_id;

      // Fetch the specific hotel
      const { data } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single();
      
      setHotel(data);
      setLoading(false);
    };
    fetchHotel();
    // Pre-fetch exchange rates
    fetchExchangeRates();
  }, []);

  return { hotel, loading };
}
