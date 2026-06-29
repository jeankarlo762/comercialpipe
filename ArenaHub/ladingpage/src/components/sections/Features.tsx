import { Calendar, Receipt, DollarSign, BarChart2, UtensilsCrossed, CalendarCheck, Users, MessageCircle } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import { FEATURES, LINKS } from '../../content';

const iconMap: Record<string, React.ElementType> = {
  Calendar,
  Receipt,
  DollarSign,
  BarChart2,
  UtensilsCrossed,
  CalendarCheck,
  Users,
};

export default function Features() {
  return (
    <section id="funcionalidades" className="py-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="text-xs text-[#F2B705] uppercase tracking-widest"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            // FUNCIONALIDADES
          </span>
          <h2
            className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 leading-tight"
            style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
          >
            Tudo que sua arena<br />
            <span className="text-[#F2B705]">precisa. Num lugar só.</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <AnimatedSection key={feature.title} delay={Math.floor(i / 4) * 0.1 + (i % 4) * 0.08}>
                <div className="group p-5 rounded-xl border border-white/8 bg-white/[0.02] hover:border-[#F2B705]/30 hover:bg-white/[0.04] transition-all h-full flex flex-col gap-3">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ background: 'rgba(242,183,5,0.12)' }}
                  >
                    {Icon && <Icon size={16} className="text-[#F2B705]" />}
                  </div>
                  <h3
                    className="text-base font-black italic uppercase text-white leading-tight"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-snug">{feature.description}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={0.3} className="flex justify-center mt-12">
          <a
            href={LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#F2B705] text-[#0A0A0A] font-semibold px-8 py-3.5 rounded hover:bg-[#DEB966] transition-colors text-base"
          >
            <MessageCircle size={18} />
            Tenho interesse
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
