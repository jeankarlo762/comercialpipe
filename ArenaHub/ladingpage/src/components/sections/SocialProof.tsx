import { motion } from 'framer-motion';
import { SOCIAL_PROOF } from '../../content';

export default function SocialProof() {
  return (
    <section className="py-16 relative overflow-hidden" style={{ background: '#F2B705' }}>
      {/* Diagonal texture */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #0A0A0A 0, #0A0A0A 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 relative">
        <motion.p
          className="text-center text-[11px] text-[#0A0A0A]/50 uppercase tracking-[0.3em] mb-10"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          // NÚMEROS REAIS
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#0A0A0A]/15">
          {SOCIAL_PROOF.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex flex-col items-center py-6 md:py-0 md:px-12"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span
                className="text-6xl md:text-7xl font-black italic text-[#0A0A0A] leading-none"
                style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.04em' }}
              >
                {item.value}
              </span>
              <span
                className="text-xs text-[#0A0A0A]/60 uppercase tracking-widest mt-3"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
