import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'reservations' | 'rooms' | 'invoices' | 'availability_blocks' | 'pricing_overrides' | 'room_types' | 'staff';

interface UseRealtimeOptions {
  hotelId: string | undefined;
  tables: TableName[];
  onUpdate: () => void;
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on specified tables,
 * filtered by hotel_id. Calls onUpdate when any change is detected.
 * Debounces rapid changes to avoid excessive re-fetches.
 */
export function useRealtimeSubscription({ hotelId, tables, onUpdate, enabled = true }: UseRealtimeOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hotelId || !enabled || tables.length === 0) return;

    const debouncedUpdate = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onUpdate();
      }, 1000); // 1s debounce to batch rapid changes
    };

    const channel = supabase
      .channel(`hotel-${hotelId}-${tables.join('-')}`)
    
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `hotel_id=eq.${hotelId}` },
        debouncedUpdate
      );
    });
    
    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [hotelId, enabled, tables.join(',')]); // stable dependency
}
