import { useState, useEffect } from 'react';

export type AdminTheme = 'light' | 'dark';

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(
    () => (localStorage.getItem('admin_theme') as AdminTheme) || 'light'
  );

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem('admin_theme', t);
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.classList.remove('admin-light', 'admin-dark');
    document.documentElement.classList.add(`admin-${theme}`);
    return () => {
      document.documentElement.classList.remove('admin-light', 'admin-dark');
    };
  }, [theme]);

  return { theme, setTheme, toggle };
}
