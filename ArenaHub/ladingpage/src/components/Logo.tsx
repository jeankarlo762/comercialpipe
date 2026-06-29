interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { mt: 'text-lg', name: 'text-sm' },
  md: { mt: 'text-2xl', name: 'text-base' },
  lg: { mt: 'text-4xl', name: 'text-xl' },
};

export default function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2 leading-none">
      <span
        className={`${s.mt} font-black italic text-[#F2B705]`}
        style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.04em' }}
      >
        MT
      </span>
      <span
        className={`${s.name} font-semibold text-[#F8F8F8]`}
        style={{ fontFamily: '"Inter", sans-serif' }}
      >
        May Tecnologia
      </span>
    </div>
  );
}
