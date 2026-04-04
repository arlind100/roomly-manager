import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();
  useAdminTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { toast.error(error.message); } else {
      localStorage.setItem('roomly_login_at', Date.now().toString());
      toast.success('Welcome back!');
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="bg-card rounded-xl border border-border/60 p-8 shadow-elevated">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,70%,55%)] flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
              <LayoutDashboard size={24} className="text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-1">{t('admin.loginTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('admin.loginSubtitle')}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('admin.email')}</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hotel.com" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('admin.password')}</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? t('admin.signingIn') : t('admin.signIn')}</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
