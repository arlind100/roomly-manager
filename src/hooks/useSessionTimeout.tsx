import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOGIN_TIMESTAMP_KEY = 'roomly_login_at';
const WARN_BEFORE_MS = 30 * 60 * 1000; // Warn 30 minutes before expiry

/**
 * Enforces a hard 24-hour session limit.
 * - Stores login timestamp on sign-in
 * - Checks every minute if the session is expired or about to expire
 * - Warns the user 30 minutes before forced logout
 * - Auto-signs out and redirects to login when expired
 */
export function useSessionTimeout() {
  const warnedRef = useRef(false);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    // On auth state change, record login timestamp
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only set timestamp if not already set (avoid resetting on tab refresh)
        if (!localStorage.getItem(LOGIN_TIMESTAMP_KEY)) {
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
        }
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        warnedRef.current = false;
        loggedOutRef.current = false;
      }
    });

    // Periodic check every 60 seconds
    const checkInterval = setInterval(async () => {
      const loginAt = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
      if (!loginAt) return;

      const elapsed = Date.now() - parseInt(loginAt, 10);
      const remaining = SESSION_MAX_AGE_MS - elapsed;

      // Session expired — force sign out
      if (remaining <= 0 && !loggedOutRef.current) {
        loggedOutRef.current = true;
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        toast.error('Your session has expired after 24 hours. Please log in again.', {
          duration: 10000,
          id: 'session-expired',
        });
        await supabase.auth.signOut();
        window.location.href = '/admin/login';
        return;
      }

      // Warn 30 minutes before expiry
      if (remaining < WARN_BEFORE_MS && remaining > 0 && !warnedRef.current) {
        warnedRef.current = true;
        const minsLeft = Math.ceil(remaining / 60000);
        toast.warning(`Your session expires in ${minsLeft} minutes. Save your work — you'll need to log in again.`, {
          duration: 15000,
          id: 'session-warning',
        });
      }

      // Also check Supabase token expiry and try to refresh
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const tokenRemaining = session.expires_at - now;
        if (tokenRemaining < 300 && tokenRemaining > 0) {
          await supabase.auth.refreshSession();
        }
      }
    }, 60000); // Check every minute

    // Also check immediately on mount
    const loginAt = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    if (loginAt) {
      const elapsed = Date.now() - parseInt(loginAt, 10);
      if (elapsed >= SESSION_MAX_AGE_MS) {
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        supabase.auth.signOut().then(() => {
          window.location.href = '/admin/login';
        });
      }
    }

    return () => {
      clearInterval(checkInterval);
      subscription.unsubscribe();
    };
  }, []);
}
