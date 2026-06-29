interface ProductLockupProps {
  size?: 'hero' | 'md';
}

export default function ProductLockup({ size = 'hero' }: ProductLockupProps) {
  const isHero = size === 'hero';
  return (
    <div className="flex flex-col items-start">
      <span
        className="text-[10px] uppercase tracking-[0.3em] text-[#F8F8F8]/50 mb-2"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        UM PRODUTO MAY TECNOLOGIA
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={`${isHero ? 'text-5xl md:text-7xl' : 'text-3xl'} font-black italic text-[#F2B705] leading-none`}
          style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.04em' }}
        >
          MT
        </span>
        <span
          className={`${isHero ? 'text-5xl md:text-7xl' : 'text-3xl'} font-black italic text-[#F8F8F8] uppercase leading-none`}
          style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.02em' }}
        >
          Quadras
        </span>
      </div>
    </div>
  );
}
