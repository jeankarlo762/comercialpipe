import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '../AnimatedSection';
import { FAQ_ITEMS } from '../../content';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-[#F2B705]"
        aria-expanded={open}
      >
        <span className="text-base font-medium text-white/80">{question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-white/40" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="text-white/55 text-sm leading-relaxed pb-5">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-24" style={{ background: '#131416' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20">
          <AnimatedSection>
            <span
              className="text-xs text-[#F2B705] uppercase tracking-widest"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              // DÚVIDAS
            </span>
            <h2
              className="text-4xl md:text-5xl font-black italic uppercase text-white mt-4 leading-tight"
              style={{ fontFamily: '"Archivo", sans-serif', letterSpacing: '-0.03em' }}
            >
              Perguntas<br />
              <span className="text-[#F2B705]">frequentes.</span>
            </h2>
            <p className="text-white/45 text-sm mt-4 leading-relaxed">
              Não achou a resposta que precisava?{' '}
              <a
                href={`https://wa.me/${''}`}
                className="text-[#F2B705] hover:text-[#DEB966] transition-colors"
              >
                Fala com a gente no WhatsApp.
              </a>
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="divide-y divide-white/8 border-t border-white/8">
              {FAQ_ITEMS.map((item) => (
                <FAQItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
