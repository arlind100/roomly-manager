import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { verifySuperadminSession } from '@/lib/superadmin';

export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    verifySuperadminSession().then(v => {
      setValid(v);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[hsl(263,70%,50%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!valid) return <Navigate to="/superadmin/login" replace />;
  return <>{children}</>;
}
