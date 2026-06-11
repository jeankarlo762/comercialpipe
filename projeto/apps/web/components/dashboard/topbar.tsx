'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from './notification-bell';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  closer: 'Closer',
  sdr: 'SDR',
};

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card/40 px-4 md:px-6">
      <div className="md:hidden text-lg font-bold text-primary">CRM NX</div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <NotificationBell />
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <Avatar name={user?.name} src={user?.avatarUrl} />
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => void logout()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
