import AnimatedSection from '../AnimatedSection';
import { HOW_IT_WORKS } from '../../content';

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24" style={{ background: '#2D2E33' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="text-xs text-[#F2B705] uppercase tracking-widest"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            // COMO FUNCIONA
          </span>
          <h2
            className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 leading-tight"
            style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
          >
            Três passos.<br />
            <span className="text-[#F2B705]">Você já está rodando.</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-[#F2B705]/30 via-[#F2B705]/60 to-[#F2B705]/30" />

          {HOW_IT_WORKS.map((step, i) => (
            <AnimatedSection key={step.step} delay={i * 0.15}>
              <div className="relative flex flex-col gap-4 p-6 rounded-xl border border-white/10 bg-white/[0.03] h-full">
                <div className="flex items-center gap-3">
                  <span
                    className="text-3xl font-black italic text-[#F2B705] leading-none"
                    style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.05em' }}
                  >
                    {step.step}
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <h3
                  className="text-xl font-black italic uppercase text-white leading-tight"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  {step.title}
                </h3>
                <p className="text-white/55 text-sm leading-relaxed">{step.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
