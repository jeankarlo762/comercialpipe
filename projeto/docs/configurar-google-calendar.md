# Configuração da Integração com Google Calendar

Este guia explica como configurar a integração do **CRM NX** com o Google Calendar para criar reuniões com link do Google Meet automaticamente.

---

## Pré-requisitos

- Conta Google (Gmail)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)
- Perfil de **Administrador** no CRM NX

---

## Passo 1 — Criar um projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. No topo da página, clique em **"Selecionar projeto"** → **"Novo projeto"**
3. Dê um nome ao projeto (ex.: `CRM NX`) e clique em **"Criar"**
4. Aguarde a criação e certifique-se de que o novo projeto está selecionado

---

## Passo 2 — Ativar a Google Calendar API

1. No menu lateral, vá em **"APIs e Serviços"** → **"Biblioteca"**
2. Pesquise por **`Google Calendar API`**
3. Clique na API e depois em **"Ativar"**
4. Aguarde a ativação (cerca de 30 segundos)

---

## Passo 3 — Configurar a Tela de Consentimento OAuth

1. Vá em **"APIs e Serviços"** → **"Tela de consentimento OAuth"**
2. Selecione o tipo **"Externo"** e clique em **"Criar"**
3. Preencha os campos obrigatórios:
   - **Nome do app:** `CRM NX`
   - **E-mail de suporte:** seu e-mail
   - **E-mail do desenvolvedor:** seu e-mail
4. Clique em **"Salvar e continuar"**
5. Na tela de **Escopos**, clique em **"Adicionar ou remover escopos"** e adicione:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `openid`
6. Clique em **"Salvar e continuar"** até finalizar

> **Nota:** Enquanto o app estiver em modo de teste, apenas e-mails adicionados como **Usuários de teste** poderão autenticar (veja Passo 4).

---

## Passo 4 — Adicionar usuários de teste

1. Na tela de consentimento OAuth, role até **"Usuários de teste"**
2. Clique em **"+ Add Users"**
3. Adicione os e-mails de todos que vão usar a integração
4. Clique em **"Salvar"**

---

## Passo 5 — Criar as Credenciais OAuth

1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ Criar credenciais"** → **"ID do cliente OAuth"**
3. Selecione o tipo **"Aplicativo da Web"**
4. Dê um nome (ex.: `CRM NX Web`)
5. Em **"URIs de redirecionamento autorizados"**, adicione:

   **Desenvolvimento (local):**
   ```
   http://localhost:3001/v1/integrations/google/callback
   ```

   **Produção** (quando fizer deploy — substitua pelo seu domínio):
   ```
   https://seudominio.com/v1/integrations/google/callback
   ```

6. Clique em **"Criar"**
7. Anote o **Client ID** e o **Client Secret** exibidos na tela

---

## Passo 6 — Configurar no CRM NX

1. Acesse o CRM NX com uma conta de **Administrador**
2. Vá em **Configurações** → aba **Google Agenda**
3. Cole o **Google Client ID** no campo correspondente
4. Cole o **Google Client Secret** no campo correspondente
5. Clique em **"Salvar credenciais"**
6. Após salvar, clique em **"Conectar conta Google"**
7. Autorize o acesso na tela do Google
8. Pronto — a integração estará ativa ✓

---

## Passo 7 — Testar o agendamento

1. Abra qualquer lead no pipeline
2. Clique em **"Agendar reunião"**
3. Preencha o título, data/hora e marque **"Gerar link do Google Meet"**
4. Clique em **"Confirmar"**
5. O evento será criado no Google Calendar com link do Meet gerado automaticamente

---

## Resolução de problemas

| Erro | Causa | Solução |
|------|-------|---------|
| `redirect_uri_mismatch` | URI de callback não cadastrado | Adicione o URI no Passo 5 |
| `access_denied` (403) | E-mail não é testador aprovado | Adicione o e-mail no Passo 4 |
| `Google Calendar API has not been used` | API não ativada | Ative a API no Passo 2 |
| `insufficient authentication scopes` | Token gerado sem os escopos | Desconecte e reconecte a conta Google |
| `Erro interno do servidor` ao salvar credenciais | Colunas do banco não criadas | Execute `npm run db:push` na API |

---

## Observações

- A integração é **por usuário** — cada membro da equipe precisa conectar sua própria conta Google nas configurações.
- O **Client ID** e **Client Secret** são configurados **uma única vez** pelo administrador e valem para todos os usuários do workspace.
- Para ambientes de produção, publique o app OAuth no Google Cloud (Tela de consentimento → "Publicar app") para remover a restrição de usuários de teste.
