'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Draggable } from '@hello-pangea/dnd';
import { Building2, CalendarPlus, Clock, Maximize2, Phone, UserPlus } from 'lucide-react';
import type { Lead } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api4comHref, openExternal, whatsappHref } from '@/lib/contact';

interface AssignableUser { id: string; name: string; }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function OwnerDropdown({
  lead,
  users,
  onAssign,
  onClose,
}: {
  lead: Lead;
  users: AssignableUser[];
  onAssign: (userId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border bg-card shadow-lg">
      <p className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Atribuir responsável</p>
      <div className="max-h-48 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => { onAssign(null); onClose(); }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px]">—</span>
          <span className="text-muted-foreground">Sem responsável</span>
        </button>
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => { onAssign(u.id); onClose(); }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent',
              lead.ownerId === u.id && 'bg-brand/10 font-medium',
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand">
              {initials(u.name)}
            </span>
            <span className="truncate">{u.name}</span>
            {lead.ownerId === u.id && <span className="ml-auto text-brand">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function customTags(lead: Lead): string[] {
  const cf = lead.customFields ?? {};
  const tags: string[] = [];
  for (const [key, value] of Object.entries(cf)) {
    if (key === 'description') continue;
    if (Array.isArray(value)) value.forEach((v) => tags.push(`${key}: ${v}`));
    else if (value === true) tags.push(key);
    else if (typeof value === 'string' && value) tags.push(`${key}: ${value}`);
    else if (typeof value === 'number') tags.push(`${key}: ${value}`);
  }
  return tags.slice(0, 6);
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export function LeadCard({
  lead,
  index,
  users,
  onSelect,
  onSchedule,
  onAssign,
}: {
  lead: Lead;
  index: number;
  users: AssignableUser[];
  onSelect: (leadId: string) => void;
  onSchedule: (leadId: string) => void;
  onAssign: (leadId: string, userId: string | null) => void;
}) {
  const router = useRouter();
  const phone = lead.contactPhone ?? '';
  const displayName = lead.contactName ?? lead.title;
  const tags = customTags(lead);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerRef = useRef<HTMLDivElement>(null);

  const daysSinceActivity = lead.lastActivityAt
    ? Math.floor((Date.now() - new Date(lead.lastActivityAt).getTime()) / 86400000)
    : null;
  const isStale = daysSinceActivity !== null && daysSinceActivity >= 7;

  function stop(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation();
    fn();
  }

  const iconBtn =
    'flex h-7 w-7 items-center justify-center rounded-md transition-colors';

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as React.CSSProperties}
          onClick={() => onSelect(lead.id)}
          className={cn(
            'flex cursor-pointer gap-2 rounded-md border bg-card p-2.5 shadow-sm transition-shadow hover:border-brand/50 hover:shadow-md',
            snapshot.isDragging && 'rotate-1 border-brand shadow-lg',
            isStale && !snapshot.isDragging && 'border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20',
          )}
        >
          {/* Coluna de ações à esquerda */}
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              title="WhatsApp"
              disabled={!phone}
              onClick={(e) => stop(e, () => openExternal(whatsappHref(phone)))}
              className={cn(iconBtn, 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 disabled:opacity-30 dark:text-emerald-400')}
            >
              <WhatsappIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Ligar (api4com)"
              disabled={!phone}
              onClick={(e) => stop(e, () => openExternal(api4comHref(phone)))}
              className={cn(iconBtn, 'bg-brand/20 text-foreground hover:bg-brand/30 disabled:opacity-30')}
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold">{displayName}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" /> {lead.accountName ?? '—'}
                </p>
                {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
              </div>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  title="Agendar reunião"
                  onClick={(e) => stop(e, () => onSchedule(lead.id))}
                  className={cn(iconBtn, 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                >
                  <CalendarPlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Abrir lead completo"
                  onClick={(e) => stop(e, () => router.push(`/leads/${lead.id}`))}
                  className={cn(iconBtn, 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Inactivity alert */}
            {isStale && (
              <p className="mt-1 flex items-center gap-1 rounded-sm bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                ⏰ Sem atividade há {daysSinceActivity} dias
              </p>
            )}

            {/* Entry date */}
            {lead.createdAt && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {(() => {
                  const d = new Date(lead.createdAt);
                  const day = d.getDate().toString().padStart(2, '0');
                  const mon = (d.getMonth() + 1).toString().padStart(2, '0');
                  const h = d.getHours().toString().padStart(2, '0');
                  const m = d.getMinutes().toString().padStart(2, '0');
                  return `Entrou ${day}/${mon} às ${h}:${m}`;
                })()}
              </p>
            )}

            {/* Owner row */}
            <div className="mt-2 flex items-center justify-between">
              <div ref={ownerRef} className="relative">
                <button
                  type="button"
                  title={lead.ownerName ?? 'Atribuir responsável'}
                  onClick={(e) => stop(e, () => setOwnerOpen((v) => !v))}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {lead.ownerName ? (
                    <>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[9px] font-bold text-brand">
                        {initials(lead.ownerName)}
                      </span>
                      <span className="max-w-[90px] truncate">{lead.ownerName}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Atribuir</span>
                    </>
                  )}
                </button>
                {ownerOpen && (
                  <OwnerDropdown
                    lead={lead}
                    users={users}
                    onAssign={(userId) => onAssign(lead.id, userId)}
                    onClose={() => setOwnerOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
