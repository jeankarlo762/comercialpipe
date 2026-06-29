import { CheckCircle } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import MockupBooking from '../MockupBooking';

const benefits = [
  'Sem WhatsApp, sem ligação, sem caderno',
  'Funciona no celular do seu cliente — sem app',
  'Atualização em tempo real: horário reservado some na hora',
  'Você recebe a notificação e confirma com um clique',
];

export default function PublicLink() {
  return (
    <section className="py-24" style={{ background: '#131416' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Left: copy */}
          <div>
            <AnimatedSection>
              <span
                className="text-xs text-[#F2B705] uppercase tracking-widest"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                // AGENDAMENTO AUTOMÁTICO
              </span>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <h2
                className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 mb-6 leading-tight"
                style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
              >
                Seu cliente<br />
                <span className="text-[#F2B705]">reserva sozinho.</span>
              </h2>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                Compartilhe um link. Seu cliente escolhe o horário, paga e confirma — sem precisar te chamar. Você só opera a arena.
              </p>
            </AnimatedSection>

            <div className="space-y-3">
              {benefits.map((b, i) => (
                <AnimatedSection key={i} delay={0.28 + i * 0.07}>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#F2B705] shrink-0 mt-0.5" />
                    <p className="text-white/65 text-sm">{b}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* Right: booking mockup */}
          <AnimatedSection delay={0.15}>
            <MockupBooking />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
