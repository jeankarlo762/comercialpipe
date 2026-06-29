import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { LINKS } from '../../content';

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24" style={{ background: '#F2B705' }}>
      {/* Diagonal texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #0A0A0A 0, #0A0A0A 1px, transparent 0, transparent 50%)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-32 bg-[#DEB966] opacity-50 pointer-events-none"
        style={{ transform: 'skewX(-9deg)', transformOrigin: 'top right' }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 relative">
        <div className="max-w-2xl mx-auto text-center">
          <motion.span
            className="text-xs text-[#0A0A0A]/50 uppercase tracking-widest block mb-4"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            // BORA COMEÇAR
          </motion.span>

          <motion.h2
            className="text-5xl md:text-6xl font-black italic uppercase text-[#0A0A0A] leading-tight mb-4"
            style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Bora colocar<br />
            sua quadra pra rodar?
          </motion.h2>

          <motion.p
            className="text-[#0A0A0A]/65 text-lg mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Sem instalação. Sem contrato. Em menos de 10 minutos você já tem uma agenda online.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <a
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-[#0A0A0A] text-white font-semibold px-10 py-4 rounded hover:bg-[#2D2E33] transition-colors text-lg"
            >
              <MessageCircle size={20} />
              Tenho interesse
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
