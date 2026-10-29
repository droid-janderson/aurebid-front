# AureBid — Frontend

**AureBid** é uma casa de leilões de cartas colecionáveis Pokémon TCG. O frontend cobre a vitrine pública, a sala de disputa em tempo real, a carteira, os arremates e o painel do leiloeiro, consumindo o contrato da API Node.js existente.

> **Este repositório é somente o frontend.** O backend, o banco e as regras financeiras vivem no projeto [aurebid-backend](https://github.com/droid-janderson/aurebid-back). Nenhuma confirmação financeira, cálculo de liquidação ou verificação de integridade é inventada no navegador.

---

## Comportamento Inesperado

Durante os testes no navegador [Brave](https://brave.com/pt-br/), foram identificados problemas na conexão em tempo real (Socket.IO) com o backend, possivelmente relacionados às configurações de privacidade e ao Brave Shields (Bloqueador de rastreadores e anúncios).

Esse comportamento pode causar atrasos ou falhas na atualização dos lances e no estado dos leilões.

**Recomendação:** para uma experiência mais estável, utilize o Chrome, Edge ou Firefox. Caso prefira o Brave, tente desativar o Brave Shields para o domínio da aplicação e teste novamente.

---

## Stack

- **React 19 + TypeScript + Vite 7**
- **React Router 7** — rotas públicas, autenticadas e por papel
- **TanStack Query 5** — cache, estados de carregamento/erro e invalidação
- **Tailwind CSS 4** — design system em `src/styles/index.css`
- **React Hook Form + Zod** — formulários validados e acessíveis
- **Radix UI** — diálogos, dropdown e tooltips
- **Lucide React** — ícones
- **Socket.IO Client** — eventos de leilão ao vivo

---

## Pré-requisitos

- Node.js **20+** (recomendado 22)
- npm 10+
- Backend AureBid rodando em `http://localhost:3000`

---

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

A aplicação sobe em **http://localhost:3001**, mesma origem esperada pelo CORS do backend.

## Deploy e hospedagem

O frontend do AureBid é desenvolvido com **React, Vite e TypeScript** e está hospedado na **[Vercel](https://vercel.com/)**.

A Vercel é responsável por disponibilizar a interface web publicamente, permitindo que os usuários acessem a plataforma pelo navegador.

### Tecnologias e configuração de deploy

- **Hospedagem:** Vercel.
- **Framework:** React.
- **Ferramenta de build:** Vite.
- **Linguagem:** TypeScript.
- **Roteamento:** aplicação de página única (SPA).
- **Comunicação com o backend:** API HTTP e Socket.IO para funcionalidades em tempo real.

### Comunicação com o backend

O frontend consome a API do AureBid para consultar lotes, registrar lances e acessar os demais recursos da plataforma. O Socket.IO é utilizado para receber atualizações em tempo real sobre lances e mudanças no estado dos leilões.

As URLs da API e as configurações de conexão devem corresponder ao ambiente de execução. Também é necessário que o backend permita a origem do frontend nas configurações de CORS, tanto para requisições HTTP quanto para conexões Socket.IO.
> A aplicação está publicada e pode ser acessada em **[https://aurebid.vercel.app](https://aurebid.vercel.app)**

### Scripts

| Comando              | Descrição                                   |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento na porta 3001   |
| `npm run build`      | Typecheck + build de produção em `dist/`    |
| `npm run preview`    | Pré-visualiza o build na porta 3001         |
| `npm run typecheck`  | TypeScript sem emitir arquivos              |
| `npm run lint`       | ESLint em todo o projeto                    |
| `npm test`           | Executa a suíte Vitest uma vez              |
| `npm run test:watch` | Vitest em modo watch                        |
| `npm run msw:init`   | Regera o service worker do MSW em `public/` |

---

## Variáveis de ambiente

| Variável          | Padrão                         | Descrição                                 |
| ----------------- | ------------------------------ | ----------------------------------------- |
| `VITE_API_URL`    | `http://localhost:3000/api/v1` | Base da API, incluindo `/api/v1`          |
| `VITE_SOCKET_URL` | origem derivada da API         | Origem do Socket.IO, sem o prefixo da API |

---

### Contas de demonstração

Essas contas estarão prefixadas na página de login podendo ser selecionados, com dados simulados e sem movimentação financeira real. Use-as para explorar a aplicação.

| Papel         | E-mail                   | Senha           |
| ------------- | ------------------------ | --------------- |
| Leiloeiro     | `auctioneer@aurebid.com` | `auctioneer123` |
| Licitante     | `bidder@aurebid.com`     | `bidder123`     |
| Licitante (2) | `bidder2@aurebid.com`    | `bidder123`     |

---

## Integração com o backend

### Endpoints consumidos

| Área             | Endpoints                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth             | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`                                              |
| Catálogo / lotes | `GET /catalog/lots`, `GET /catalog/lots/mine`, `GET /catalog/lots/:id`, `POST /catalog/lots`, `PUT /catalog/lots/:id`, `DELETE /catalog/lots/:id` |
| Leilão           | `GET /auctions/:id`, `POST /auctions/:id/publish`, `POST /auctions/:id/cancel`, `POST /auctions/:id/end`                                          |
| Lances           | `GET /auctions/:id/bids`, `POST /auctions/:id/bids`, `GET /bids`                                                                                  |
| Carteira         | `GET /wallets`, `GET /wallets/transactions`, `POST /wallets/deposit`                                                                              |
| Liquidação       | `GET /settlements`, `GET /settlements/public/:token`, `POST /settlements/:id/process`                                                             |

### Tempo real

Handshake autenticado por JWT em `auth: { token }`. Eventos do servidor:

- `auction:join` / `auction:leave` (cliente → servidor)
- `auction:state`, `bid:new`, `auction:status_change`, `auction:ended`, `auction:timer` (servidor → cliente)

O cliente atualiza o cache do TanStack Query ao receber eventos. Se o socket cair, a sala continua funcional via polling/refetch e o indicador mostra “Reconectando” ou “Sem sinal ao vivo”.

---

## Rotas do frontend

| Rota                      | Acesso                 | Tela                                            |
| ------------------------- | ---------------------- | ----------------------------------------------- |
| `/`                       | Pública                | Vitrine, destaque e filtros                     |
| `/lotes/:lotId`           | Pública                | Sala do lote, lances e histórico                |
| `/lotes/:lotId/auditoria` | Pública                | Trilha de lances com sequência e hashes         |
| `/recibo/:token`          | Pública                | Recibo público de arremate (sem dados pessoais) |
| `/login`                  | Somente visitante      | Login                                           |
| `/cadastro`               | Somente visitante      | Cadastro de licitante ou leiloeiro              |
| `/carteira`               | Autenticada            | Saldo, reservas e extrato                       |
| `/arremates`              | Autenticada            | Compras e vendas liquidadas                     |
| `/painel`                 | `AUCTIONEER` / `ADMIN` | Painel de lotes do leiloeiro                    |
| `/painel/lotes/novo`      | `AUCTIONEER` / `ADMIN` | Cadastro de lote                                |
| `/painel/lotes/:lotId`    | `AUCTIONEER` / `ADMIN` | Gerenciamento e ações do lote                   |
| `/painel/resultados`      | `AUCTIONEER` / `ADMIN` | Resultados de venda e liquidações               |
| `*`                       | Pública                | Página 404                                      |

Rotas protegidas redirecionam para `/login?from=...` e retornam ao destino após autenticar. Áreas de outro papel exibem uma tela de acesso restrito — a autorização definitiva permanece no servidor.

---

## Arquitetura

```text
src/
  components/        # UI reutilizável (ui, layout, lots, cards, feedback, auth)
  contexts/          # AuthContext (sessão + usuário)
  hooks/             # useCountdown, useDebouncedValue, useDocumentTitle
  layouts/           # AppShell
  lib/               # Query Client
  mocks/             # MSW: handlers, banco em memória, fixtures, socket simulado
  pages/             # Telas por domínio (seller, wallet, settlements, audit)
  realtime/          # Abstração de tempo real + Socket.IO + useLotRoom
  router/            # Rotas e guards por papel
  services/          # HTTP client, sessão e serviços por domínio
  test/              # Setup, servidor MSW e utilitários de teste
  types/             # Tipos de domínio e da API
  utils/             # Dinheiro, datas, erros, rótulos, pseudônimos, env
```

### Decisões de confiança

- **O servidor é a autoridade.** Preço atual, incremento, saldo, reservas, status e liquidação vêm sempre da API.
- Valores monetários são tratados como **números decimais em BRL**; operações de comparação e soma usam **centavos inteiros** para evitar erro de ponto flutuante.
- A interface bloqueia preventivamente ações inválidas (lance abaixo do mínimo, lance do próprio leiloeiro, novo lance de quem já lidera), mas **sempre exibe o erro devolvido pelo servidor** quando ele decide.
- Nenhum total financeiro é inventado. Se o backend não fornece um agregado, a tela omite o dado e explica a ausência.
- O recibo público **não renderiza e-mails nem IDs internos**: comprador e vendedor aparecem como pseudônimos estáveis derivados dos IDs.

---

## Licença

Projeto de demonstração técnica. Pokémon e nomes de coleções pertencem aos respectivos titulares.
