import { cn } from '@/lib/utils';

interface NxLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function NxLogo({ size = 'md', className }: NxLogoProps) {
  const sizes = {
    sm: { box: 'h-8 w-8', text: 'text-xs' },
    md: { box: 'h-10 w-10', text: 'text-sm' },
    lg: { box: 'h-12 w-12', text: 'text-base' },
  };
  const s = sizes[size];
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-amber-400/20 ring-1 ring-amber-400/40',
        s.box,
        className,
      )}
    >
      <span className={cn('font-black tracking-tighter text-amber-400', s.text)}>NX</span>
    </div>
  );
}
