import { Mail } from 'lucide-react';
import Logo from '../Logo';
import { LINKS } from '../../content';

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'FAQ', href: '#faq' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/8" style={{ background: '#0A0A0A' }}>
      {/* Diagonal amber accent bottom */}
      <div
        className="absolute bottom-0 right-0 left-0 h-px bg-[#F2B705] opacity-20"
        style={{ transform: 'skewX(-9deg)' }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Logo size="md" />
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              MT Quadras é um produto da May Tecnologia — sistemas que funcionam, sem enrolação.
            </p>
            <span
              className="text-[10px] text-white/25 uppercase tracking-widest"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              MT Quadras — um produto May Tecnologia
            </span>
          </div>

          {/* Nav */}
          <div>
            <p
              className="text-[10px] text-white/30 uppercase tracking-widest mb-4"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Navegação
            </p>
            <ul className="flex flex-col gap-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/55 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p
              className="text-[10px] text-white/30 uppercase tracking-widest mb-4"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Contato
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${LINKS.contact}`}
                className="flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors"
              >
                <Mail size={14} className="text-[#F2B705]" />
                {LINKS.contact}
              </a>
              <a
                href="https://www.instagram.com/maytecnologia.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors"
              >
                <span className="text-[#F2B705] text-xs font-bold">IG</span>
                {LINKS.instagram}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            © {year} May Tecnologia. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1 text-xs text-white/20">
            <span>Feito com</span>
            <span className="text-[#F2B705]">♥</span>
            <span>pela May Tecnologia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
