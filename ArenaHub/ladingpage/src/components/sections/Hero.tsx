import { motion } from 'framer-motion';
import { MessageCircle, ChevronDown } from 'lucide-react';
import ProductLockup from '../ProductLockup';
import MockupDashboard from '../MockupDashboard';
import { LINKS } from '../../content';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] as const },
});

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Diagonal amber accent */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04] pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #F2B705 0%, transparent 60%)',
          transform: 'skewX(-9deg)',
          transformOrigin: 'top right',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[2px] bg-[#F2B705] opacity-20 pointer-events-none"
        style={{ transform: 'skewX(-9deg)' }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 w-full py-20 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <motion.div {...fadeUp(0)}>
              <ProductLockup size="hero" />
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-black italic uppercase leading-none text-white m-0"
              style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
              {...fadeUp(0.15)}
            >
              Sua quadra<br />
              <span className="text-[#F2B705]">no automático.</span>
            </motion.h1>

            <motion.p
              className="text-lg text-white/60 leading-relaxed max-w-md"
              {...fadeUp(0.25)}
            >
              Pare de perder dinheiro com horário vazio e horas perdidas no WhatsApp.
              Agenda, comandas e financeiro num só lugar — sua quadra fatura mais trabalhando menos.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-3" {...fadeUp(0.35)}>
              <a
                href={LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#F2B705] text-[#0A0A0A] font-semibold px-6 py-3.5 rounded hover:bg-[#DEB966] transition-colors text-base"
              >
                <MessageCircle size={18} />
                Tenho interesse
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/80 font-medium px-6 py-3.5 rounded hover:border-white/40 hover:text-white transition-colors text-base"
              >
                Ver funcionalidades
              </a>
            </motion.div>

            <motion.div
              className="flex items-center gap-6 pt-2"
              {...fadeUp(0.45)}
            >
              {[
                'Implantação inclusa',
                'Mensalidade sem fidelidade',
                'Suporte incluso',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-white/40">
                  <span className="w-1 h-1 rounded-full bg-[#F2B705]" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: dashboard mockup */}
          <div className="relative">
            <MockupDashboard />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="flex justify-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <ChevronDown size={20} className="text-white/20" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
