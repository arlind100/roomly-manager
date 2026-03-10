import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useHotel() {
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotel = async () => {
      const { data } = await supabase
        .from('hotels')
        .select('*')
        .limit(1)
        .single();
      setHotel(data);
      setLoading(false);
    };
    fetchHotel();
  }, []);

  return { hotel, loading };
}
