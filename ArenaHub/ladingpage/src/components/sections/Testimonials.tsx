import { Quote } from 'lucide-react';
import { TESTIMONIALS } from '../../content';
import AnimatedSection from '../AnimatedSection';

export default function Testimonials() {
  return (
    <section id="clientes" className="py-24" style={{ background: '#131416' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="text-xs text-[#F2B705] uppercase tracking-widest"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            // DEPOIMENTOS
          </span>
          <h2
            className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 leading-tight"
            style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
          >
            Quem já usa<br />
            <span className="text-[#F2B705]">fala por nós.</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={i} delay={i * 0.08}>
              <div className="flex flex-col gap-5 p-6 rounded-xl border border-white/8 bg-white/[0.02] h-full">
                <Quote size={18} className="text-[#F2B705]" />
                <p className="text-white/75 text-sm leading-relaxed flex-1 italic">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                  <div className="w-9 h-9 rounded-full bg-[#F2B705]/15 flex items-center justify-center shrink-0">
                    <span
                      className="text-sm font-black italic text-[#F2B705]"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      {t.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.arena}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
