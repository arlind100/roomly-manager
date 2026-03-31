import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Monitors Supabase auth session and warns the user before expiry.
 * Auto-refreshes when possible; shows warning toast if refresh fails.
 */
export function useSessionTimeout() {
  const warnedRef = useRef(false);

  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const now = Math.floor(Date.now() / 1000);
      const remaining = expiresAt - now;

      // Warn at 5 minutes
      if (remaining < 300 && remaining > 0 && !warnedRef.current) {
        warnedRef.current = true;
        // Try to refresh first
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          toast.warning('Your session is about to expire. Please save your work and refresh the page.', {
            duration: 15000,
            id: 'session-warning',
          });
        } else {
          warnedRef.current = false; // Reset after successful refresh
        }
      }

      // Reset warning flag if session was refreshed
      if (remaining > 300) {
        warnedRef.current = false;
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, []);
}
