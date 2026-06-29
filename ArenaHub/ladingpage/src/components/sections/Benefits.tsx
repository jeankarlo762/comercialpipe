import { TrendingUp, Clock, Users } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import { BENEFITS } from '../../content';

const iconMap: Record<string, React.ElementType> = { TrendingUp, Clock, Users };

export default function Benefits() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#0A0A0A' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="text-xs text-[#F2B705] uppercase tracking-widest"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            // RESULTADO
          </span>
          <h2
            className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 leading-tight"
            style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
          >
            O que muda no<br />
            <span className="text-[#F2B705]">seu negócio.</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-5">
          {BENEFITS.map((benefit, i) => {
            const Icon = iconMap[benefit.icon];
            return (
              <AnimatedSection key={benefit.title} delay={i * 0.12}>
                <div className="relative flex flex-col h-full rounded-xl border border-white/10 overflow-hidden">
                  {/* Top: big metric */}
                  <div
                    className="px-7 pt-8 pb-6 flex flex-col gap-1"
                    style={{ background: '#131416' }}
                  >
                    <div className="flex items-end gap-3 mb-1">
                      <span
                        className="text-5xl font-black italic text-[#F2B705] leading-none"
                        style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.04em' }}
                      >
                        {benefit.stat}
                      </span>
                      {Icon && <Icon size={22} className="text-[#F2B705]/60 mb-1" />}
                    </div>
                    <span
                      className="text-[10px] text-white/35 uppercase tracking-widest"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {benefit.statLabel}
                    </span>
                  </div>

                  {/* Divider with amber accent */}
                  <div className="h-px w-full" style={{ background: 'rgba(242,183,5,0.2)' }} />

                  {/* Bottom: title + description */}
                  <div className="px-7 py-6 flex flex-col gap-3 flex-1" style={{ background: '#0F1012' }}>
                    <h3
                      className="text-lg font-black italic uppercase text-white leading-tight"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      {benefit.title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
