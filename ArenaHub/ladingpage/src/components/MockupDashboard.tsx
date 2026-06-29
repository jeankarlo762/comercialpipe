import { motion } from 'framer-motion';

const schedule = [
  { time: '08:00', name: 'João Henrique', court: 'Quadra 1', type: 'avulso', paid: true },
  { time: '09:00', name: 'Marina Costa', court: 'Quadra 2', type: 'avulso', paid: true },
  { time: '10:00', name: 'Pedro Alves', court: 'Quadra 1', type: 'avulso', paid: false },
  { time: '11:00', name: 'Time Alpha', court: 'Quadra 3', type: 'torneio', paid: true },
  { time: '14:00', name: 'Carla Mendes', court: 'Quadra 2', type: 'avulso', paid: true },
];

const stats = [
  { label: 'Ocupação hoje', value: '78%', trend: '+12%' },
  { label: 'Faturamento', value: 'R$ 2.840', trend: '+8%' },
  { label: 'Clientes', value: '134', trend: '+7' },
];

const typeColors: Record<string, string> = {
  avulso: 'text-[#F8F8F8]/60',
  torneio: 'text-[#DEB966]',
};

export default function MockupDashboard() {
  return (
    <motion.div
      className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-white/10"
      style={{ background: '#1A1B1F' }}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10" style={{ background: '#131416' }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <span className="text-xs text-white/30 mx-auto" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          mt-quadras · painel
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg p-3 border border-white/8" style={{ background: '#0A0A0A' }}>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {stat.label}
              </p>
              <p className="text-base font-semibold text-white leading-none">{stat.value}</p>
              <p className="text-xs text-[#F2B705] mt-1">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Agenda */}
        <div className="rounded-lg border border-white/8 overflow-hidden" style={{ background: '#0A0A0A' }}>
          <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">Agenda de hoje</span>
            <span className="text-[10px] text-[#F2B705] uppercase tracking-wider" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Sábado
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {schedule.map((item, i) => (
              <motion.div
                key={i}
                className="px-3 py-2.5 flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              >
                <span className="text-[11px] text-white/40 w-10 shrink-0" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {item.time}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-white/40">{item.court}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wide ${typeColors[item.type] ?? 'text-white/40'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {item.type}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.paid ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between text-[10px] text-white/30" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <span>● SISTEMA ONLINE</span>
          <span>atualizado agora</span>
        </div>
      </div>
    </motion.div>
  );
}
