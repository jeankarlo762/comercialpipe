import AnimatedSection from '../AnimatedSection';
import Logo from '../Logo';
import { ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <section id="sobre" className="py-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-6">
              <Logo size="md" />
              <div className="w-px h-10 bg-white/10" />
              <span
                className="text-xs text-white/40 uppercase tracking-widest"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                A empresa por trás
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <h2
              className="text-3xl md:text-4xl font-black italic uppercase text-white leading-tight mb-6"
              style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
            >
              Sobre a<br />
              <span className="text-[#F2B705]">MK Sistemas</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <p className="text-white/60 text-base leading-relaxed mb-6">
              A MK Sistemas desenvolve sistemas e produtos de software com foco em resolver problemas reais de quem opera negócios. O ArenaHub é um dos nossos produtos — construído ouvindo donos de arena e refinado com uso no dia a dia.
            </p>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Acreditamos que tecnologia boa não precisa ser complicada. Precisa funcionar.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <a
              href="https://www.instagram.com/maytecnologia.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#F2B705] hover:text-[#DEB966] transition-colors"
            >
              Conheça a MK Sistemas
              <ArrowRight size={14} />
            </a>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
