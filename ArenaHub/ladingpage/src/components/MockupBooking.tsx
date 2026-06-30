import { motion } from 'framer-motion';

const slots = [
  { time: '08:00', status: 'taken' },
  { time: '09:00', status: 'taken' },
  { time: '10:00', status: 'free' },
  { time: '11:00', status: 'selected' },
  { time: '12:00', status: 'free' },
  { time: '13:00', status: 'taken' },
  { time: '14:00', status: 'free' },
  { time: '15:00', status: 'free' },
  { time: '16:00', status: 'taken' },
  { time: '17:00', status: 'free' },
  { time: '18:00', status: 'taken' },
  { time: '19:00', status: 'taken' },
];

const slotStyle: Record<string, string> = {
  free: 'border border-white/20 text-white/60 hover:border-[#F2B705]/50',
  taken: 'bg-white/5 text-white/20 cursor-not-allowed line-through',
  selected: 'bg-[#F2B705] text-[#0A0A0A] font-semibold',
};

export default function MockupBooking() {
  return (
    <motion.div
      className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-white/10"
      style={{ background: '#1A1B1F' }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between" style={{ background: '#131416' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#F2B705] font-black italic" style={{ fontFamily: '"Archivo", sans-serif' }}>MK</span>
          <span className="text-xs text-white/50">· reservas</span>
        </div>
        <span className="text-[10px] text-white/30" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Sábado, 28 Jun</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Court selector */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Quadra
          </p>
          <div className="flex gap-2">
            {['Quadra 1', 'Quadra 2', 'Quadra 3'].map((q, i) => (
              <button
                key={q}
                className={`px-3 py-1.5 rounded text-xs border transition-colors ${i === 0 ? 'border-[#F2B705] text-[#F2B705]' : 'border-white/15 text-white/40'}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Slots grid */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Horário
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {slots.map((slot, i) => (
              <motion.div
                key={slot.time}
                className={`rounded px-2 py-2 text-center text-xs transition-colors ${slotStyle[slot.status]}`}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {slot.time}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm border border-white/20 inline-block" />
            Livre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#F2B705] inline-block" />
            Selecionado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-white/5 inline-block" />
            Ocupado
          </span>
        </div>

        {/* CTA */}
        <button className="w-full bg-[#F2B705] text-[#0A0A0A] font-semibold py-3 rounded text-sm">
          Confirmar reserva — 11:00
        </button>
      </div>
    </motion.div>
  );
}
