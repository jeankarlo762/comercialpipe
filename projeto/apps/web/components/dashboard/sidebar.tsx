'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  GitBranch,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
  Workflow,
} from 'lucide-react';
import { roleHasPermission, type Permission } from '@commercialpipe/shared-types';
import { useAuth } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof KanbanSquare;
  permission?: Permission;
}

interface PipelineItem {
  id: string;
  name: string;
  color: string;
}

const BEFORE_PIPELINE: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'reports:read' },
];

const AFTER_PIPELINE: NavItem[] = [
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/contacts', label: 'Contatos', icon: Building2 },
  { href: '/importacao', label: 'Importação Inteligente', icon: Upload },
  { href: '/calendar', label: 'Calendário', icon: CalendarDays },
  { href: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/mensagens-prontas', label: 'Mensagens Prontas', icon: MessageSquare },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard Admin', icon: LayoutDashboard, permission: 'users:manage' },
  { href: '/metas', label: 'Metas e Cotas', icon: Target, permission: 'reports:read' },
  { href: '/gestao-pipe', label: 'Gestão de Pipes', icon: GitBranch, permission: 'users:manage' },
  { href: '/forms', label: 'Formulários', icon: FileText, permission: 'users:manage' },
  { href: '/automations', label: 'Automações', icon: Workflow, permission: 'users:manage' },
  { href: '/audit', label: 'Auditoria', icon: ScrollText, permission: 'users:manage' },
  { href: '/admin', label: 'Usuários', icon: Users, permission: 'users:manage' },
];

function PipelineSubNav({ pipelineList, pipelinesOpen }: { pipelineList: PipelineItem[]; pipelinesOpen: boolean }) {
  const searchParams = useSearchParams();
  const activePipelineId = searchParams.get('p');

  if (!pipelinesOpen) return null;

  return (
    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/50 pl-3">
      {pipelineList.length > 0 ? (
        pipelineList.map((p) => {
          const isActive = activePipelineId === p.id;
          return (
            <Link
              key={p.id}
              href={`/pipeline?p=${p.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', isActive && 'ring-2 ring-yellow-400 ring-offset-1')}
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          );
        })
      ) : (
        <Link
          href="/pipeline"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
          <span>Pipeline Principal</span>
        </Link>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isPipelineRoute = pathname.startsWith('/pipeline');
  const [pipelinesOpen, setPipelinesOpen] = useState(isPipelineRoute);

  const { data: pipelineList } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiGet<{ pipelines: PipelineItem[] }>('/pipelines').then((r) => r.pipelines),
    staleTime: 5 * 60_000,
  });

  const can = (p?: Permission) => !p || (user != null && roleHasPermission(user.role, p));

  function renderItem(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'border-brand bg-brand/15 text-foreground'
            : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Icon className={cn('h-4 w-4', active && 'text-brand')} />
        {item.label}
      </Link>
    );
  }

  const adminItems = ADMIN_NAV.filter((i) => can(i.permission));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Sparkles className="h-6 w-6 text-brand" />
        <span className="text-lg font-bold tracking-tight">CRM NX</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">

        {/* Dashboard primeiro */}
        {BEFORE_PIPELINE.filter((i) => can(i.permission)).map(renderItem)}

        {/* Pipeline com submenu */}
        <div>
          <button
            type="button"
            onClick={() => setPipelinesOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
              isPipelineRoute
                ? 'border-brand bg-brand/15 text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <KanbanSquare className={cn('h-4 w-4', isPipelineRoute && 'text-brand')} />
            <span className="flex-1 text-left">Pipeline</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', pipelinesOpen && 'rotate-180')}
            />
          </button>

          <Suspense fallback={null}>
            <PipelineSubNav
              pipelineList={pipelineList ?? []}
              pipelinesOpen={pipelinesOpen}
            />
          </Suspense>
        </div>

        {/* Restante da nav principal */}
        {AFTER_PIPELINE.filter((i) => can(i.permission)).map(renderItem)}

        {/* Seção Admin */}
        {adminItems.length > 0 && (
          <div className="pt-4">
            <div className="mb-1 flex items-center gap-2 px-3">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                Administrador
              </span>
              <span className="h-px flex-1 bg-brand/30" />
            </div>
            <div className="space-y-1 rounded-md border border-brand/20 bg-brand/[0.04] p-1">
              {adminItems.map(renderItem)}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
