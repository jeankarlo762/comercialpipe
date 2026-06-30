interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { mk: 'text-lg', name: 'text-sm' },
  md: { mk: 'text-2xl', name: 'text-base' },
  lg: { mk: 'text-4xl', name: 'text-xl' },
};

export default function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2 leading-none">
      <span
        className={`${s.mk} font-black italic text-[#F2B705]`}
        style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.04em' }}
      >
        MK
      </span>
      <span
        className={`${s.name} font-semibold text-[#F8F8F8]`}
        style={{ fontFamily: '"Inter", sans-serif' }}
      >
        MK Sistemas
      </span>
    </div>
  );
}
