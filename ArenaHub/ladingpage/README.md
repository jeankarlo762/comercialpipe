# MT Quadras — Landing Page

Landing page do produto **MT Quadras** da **May Tecnologia**.

## Como rodar

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## Onde trocar os placeholders

Abra `src/content.ts` e substitua:

| Placeholder | O que é |
|---|---|
| `[LINK_WHATSAPP]` | Link completo do WhatsApp (`https://wa.me/55...`) |
| `[URL_DO_FORM]` | URL do formulário de agendamento de demo |
| `[URL_SITE_EMPRESA]` | URL do site da May Tecnologia |
| `contato@maytecnologia.com` | E-mail de contato real |
| `@maytecnologia` | Handle do Instagram da empresa |
| Valores `[+X]`, `[X mil]`, `[X%]` | Números reais de prova social |
| Preços `[R$ XX/mês]` | Preços reais dos planos |
| Dados de `TESTIMONIALS` | Depoimentos reais de clientes |

## Como substituir as logos

### Logo da May Tecnologia

O componente `src/components/Logo.tsx` usa o monograma "MT" como placeholder.

Para trocar pela logo definitiva:
1. Coloque o SVG em `public/logo-may.svg`
2. Edite `src/components/Logo.tsx` substituindo o conteúdo pelo `<img src="/logo-may.svg" ... />`

### Lockup do MT Quadras

O componente `src/components/ProductLockup.tsx` usa tipografia como placeholder.

Para trocar pelo lockup definitivo:
1. Coloque o SVG em `public/lockup-mt-quadras.svg`
2. Edite `src/components/ProductLockup.tsx` substituindo pelo `<img>`

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Framer Motion
- lucide-react
