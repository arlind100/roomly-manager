import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminLogin } from '@/lib/superadmin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperadminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  useAdminTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await superadminLogin(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome, Superadmin');
      navigate('/superadmin');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="bg-card rounded-xl border border-border/60 p-8 shadow-card">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold mb-1">Superadmin Access</h1>
            <p className="text-sm text-muted-foreground">Roomly Platform Management</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sa-email">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="sa-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="superadmin@roomly.app" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-password">Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="sa-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[hsl(263,70%,50%)] to-[hsl(280,80%,60%)] hover:brightness-110">
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Signing In...</> : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
