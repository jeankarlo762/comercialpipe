import type { AiScore } from '@commercialpipe/shared-types';
import { cn } from '@/lib/utils';

const SCORE_STYLES: Record<AiScore, string> = {
  A: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  B: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  C: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  D: 'bg-red-500/15 text-red-500 border-red-500/30',
};

export function ScoreBadge({ score, className }: { score: AiScore | null; className?: string }) {
  if (!score) {
    return (
      <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-xs text-muted-foreground', className)}>
        –
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold',
        SCORE_STYLES[score],
        className,
      )}
      title={`Score de IA: ${score}`}
    >
      {score}
    </span>
  );
}
