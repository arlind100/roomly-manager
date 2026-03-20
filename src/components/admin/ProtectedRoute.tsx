import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [roleChecked, setRoleChecked] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const checkSuspension = useCallback(async () => {
    if (!user) return;
    // Get user's hotel_id from user_roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('hotel_id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (roles && roles.length > 0 && roles[0].hotel_id) {
      const { data: hotel } = await supabase
        .from('hotels')
        .select('subscription_status')
        .eq('id', roles[0].hotel_id)
        .single();
      
      if (hotel?.subscription_status === 'suspended') {
        setSuspended(true);
        toast.error('Your account has been suspended. Please contact support.');
        await signOut();
      }
    }
  }, [user, signOut]);

  useEffect(() => {
    if (!user) {
      setRoleChecked(true);
      return;
    }

    const checkRole = async () => {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (isAdmin) {
        setHasAdminRole(true);
        setRoleChecked(true);
        await checkSuspension();
        return;
      }
      const { data: isManager } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'manager' });
      setHasAdminRole(!!isManager);
      setRoleChecked(true);
      if (isManager) await checkSuspension();
    };

    checkRole();
  }, [user, checkSuspension]);

  // Re-check suspension on every render / route change
  useEffect(() => {
    if (!user || !roleChecked || !hasAdminRole) return;
    checkSuspension();
  }, [user, roleChecked, hasAdminRole, checkSuspension]);

  if (suspended) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading || !roleChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access the admin panel.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
