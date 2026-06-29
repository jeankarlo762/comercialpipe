import { X } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import { PROBLEMS } from '../../content';

export default function Problem() {
  return (
    <section id="problema" className="py-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center md:text-left md:mx-0">
          <AnimatedSection>
            <span
              className="text-xs text-[#F2B705] uppercase tracking-widest"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              // HOJE
            </span>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <h2
              className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 mb-10 leading-tight"
              style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
            >
              Caderno + grupo de<br />
              <span className="text-white/50">WhatsApp dá nisso:</span>
            </h2>
          </AnimatedSection>

          <div className="space-y-4">
            {PROBLEMS.map((problem, i) => (
              <AnimatedSection key={i} delay={0.15 + i * 0.08}>
                <div className="flex items-start gap-4 p-4 rounded-lg border border-white/8 bg-white/[0.02]">
                  <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <X size={13} className="text-red-400" />
                  </div>
                  <p className="text-white/70 text-base leading-snug">{problem}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.55}>
            <p className="mt-8 text-white/40 text-sm italic">
              Não é falta de dedicação. É falta de ferramenta.
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
