'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  List,
  AlignJustify,
  LayoutGrid,
  Pencil,
  Trash2,
  UserX,
  UserCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { USER_ROLES, type UserRole } from '@commercialpipe/shared-types';
import { apiDelete, apiGetPaginated, apiPatch, apiPost, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { cn, formatDateTime } from '@/lib/utils';

interface UserRow extends User {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

type ViewMode = 'table' | 'list' | 'compact';
type SortKey = 'name' | 'email' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  closer: 'Closer',
  sdr: 'SDR',
};

const ROLE_CLASSES: Record<UserRole, string> = {
  admin: 'border border-violet-500/40 bg-violet-500/10 text-violet-300',
  manager: 'border border-sky-500/40 bg-sky-500/10 text-sky-300',
  closer: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  sdr: 'border border-amber-500/40 bg-amber-500/10 text-amber-300',
};

const VIEW_OPTIONS = [
  { mode: 'table' as ViewMode, label: 'Tabela' },
  { mode: 'list' as ViewMode, label: 'Lista' },
  { mode: 'compact' as ViewMode, label: 'Grade' },
];

const VIEW_ICONS = [List, AlignJustify, LayoutGrid];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-green-500' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_CLASSES[role])}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'sdr' as UserRole });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sdr' as UserRole,
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGetPaginated<UserRow[]>('/users', { limit: 100 }),
    staleTime: 30_000,
  });

  const filteredUsers = useMemo(() => {
    let rows = data?.data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const va = String(a[sortKey] ?? '');
      const vb = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return rows;
  }, [data, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/users', createForm);
      toast.success('Usuário criado com sucesso');
      setCreateForm({ name: '', email: '', password: '', role: 'sdr' });
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
      };
      if (editForm.password.trim()) payload.password = editForm.password;
      await apiPatch(`/users/${editTarget.id}`, payload);
      toast.success('Usuário atualizado');
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atualizar');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/users/${deleteTarget.id}`);
      toast.success('Usuário excluído');
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    if (u.id === currentUser?.id) { toast.error('Você não pode desativar sua própria conta'); return; }
    try {
      await apiPatch(`/users/${u.id}`, { isActive: !u.isActive });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atualizar');
    }
  }

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive });
    setEditOpen(true);
  }

  function openDelete(u: UserRow) {
    setDeleteTarget(u);
  }

  const colLabel = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground';

  function SortBtn({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sortKey === col;
    return (
      <button onClick={() => handleSort(col)} className={cn('flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wider', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
        {children}
        {active ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
      </button>
    );
  }

  function RowActions({ u }: { u: UserRow }) {
    return (
      <div className="flex items-center gap-0.5">
        <button onClick={() => openEdit(u)} title="Editar" className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {u.id !== currentUser?.id && (
          <>
            <button
              onClick={() => toggleActive(u)}
              title={u.isActive ? 'Desativar' : 'Ativar'}
              className={cn('rounded p-1.5 transition-colors', u.isActive ? 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400' : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-400')}
            >
              {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => openDelete(u)} title="Excluir" className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  if (!isLoading && currentUser?.role !== 'admin') {
    router.push('/pipeline');
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            Usuários <HelpCircle className="h-4 w-4 cursor-default text-muted-foreground" />
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b px-6 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="h-9 w-80 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          {VIEW_OPTIONS.map(({ mode, label }, i) => {
            const Icon = VIEW_ICONS[i]!;
            return (
              <button key={mode} title={label} onClick={() => setViewMode(mode)} className={cn('rounded p-1.5 transition-colors', viewMode === mode ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-1 p-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}</div>
        ) : viewMode === 'table' ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="w-12 px-4 py-3" />
                <th className="w-10 px-4 py-3 text-left"><span className={colLabel}>ID</span></th>
                <th className="px-4 py-3 text-left"><SortBtn col="name">Nome</SortBtn></th>
                <th className="px-4 py-3 text-left"><SortBtn col="email">Email</SortBtn></th>
                <th className="px-4 py-3 text-left"><SortBtn col="role">Perfil</SortBtn></th>
                <th className="px-4 py-3 text-left"><span className={colLabel}>Último Acesso</span></th>
                <th className="px-4 py-3 text-left"><span className={colLabel}>Status</span></th>
                <th className="px-4 py-3 text-left"><span className={colLabel}>Ativo</span></th>
                <th className="px-4 py-3 text-left"><span className={colLabel}>Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : filteredUsers.map((u, idx) => (
                <tr key={u.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3"><Avatar name={u.name} src={u.avatarUrl} className="h-8 w-8" /></td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                  <td className="px-4 py-3"><Toggle checked={u.isActive} onChange={() => toggleActive(u)} /></td>
                  <td className="px-4 py-3"><RowActions u={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : viewMode === 'list' ? (
          <div className="divide-y">
            {filteredUsers.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Nenhum usuário encontrado</p>
            ) : filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30">
                <Avatar name={u.name} src={u.avatarUrl} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{u.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
                <p className="hidden text-xs text-muted-foreground xl:block">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca acessou'}</p>
                <StatusBadge active={u.isActive} />
                <Toggle checked={u.isActive} onChange={() => toggleActive(u)} />
                <RowActions u={u} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredUsers.length === 0 ? (
              <p className="col-span-full py-12 text-center text-muted-foreground">Nenhum usuário encontrado</p>
            ) : filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
                <Avatar name={u.name} src={u.avatarUrl} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <div className="mt-1.5"><RoleBadge role={u.role} /></div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Toggle checked={u.isActive} onChange={() => toggleActive(u)} />
                  <RowActions u={u} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <form onSubmit={createUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nome</Label>
              <Input id="c-name" required placeholder="Nome completo" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" required placeholder="email@empresa.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-password">Senha (mín. 8)</Label>
                <Input id="c-password" type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USER_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar Usuário'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="mb-2 flex items-center gap-3 rounded-lg border bg-accent/30 px-3 py-2">
              <Avatar name={editTarget.name} src={editTarget.avatarUrl} className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{editTarget.name}</p>
                <p className="truncate text-xs text-muted-foreground">{editTarget.email}</p>
              </div>
            </div>
          )}
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="e-name">Nome</Label>
                <Input id="e-name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-email">E-mail</Label>
                <Input id="e-email" type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-password">Nova senha <span className="text-xs text-muted-foreground">(deixe vazio para manter a atual)</span></Label>
              <Input id="e-password" type="password" minLength={8} placeholder="••••••••" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USER_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.isActive ? 'active' : 'inactive'} onValueChange={(v) => setEditForm({ ...editForm, isActive: v === 'active' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editForm.isActive && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                Usuários inativos não conseguem fazer login no sistema.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {deleteTarget && (
              <div className="flex items-center gap-3 rounded-lg border bg-accent/30 px-3 py-2">
                <Avatar name={deleteTarget.name} src={deleteTarget.avatarUrl} className="h-9 w-9 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{deleteTarget.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{deleteTarget.email}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong>permanente</strong> e não pode ser desfeita. O usuário perderá todo o acesso ao sistema imediatamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDelete}>
              {saving ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
