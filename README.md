# AureBid — Frontend

Aplicação web da **AureBid**, uma casa de leilões de cartas colecionáveis Pokémon TCG. O frontend cobre a vitrine pública, a sala de disputa em tempo real, a carteira, os arremates e o painel do leiloeiro, consumindo o contrato da API Node.js existente.

> **Este repositório é somente o frontend.** O backend, o banco e as regras financeiras vivem no projeto `aurebid-backend`. Nenhuma confirmação financeira, cálculo de liquidação ou verificação de integridade é inventada no navegador.

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
- **MSW 2** — simulação local do contrato real da API (modo demonstração e testes)
- **Vitest + Testing Library** — testes de integração de UI

---

## Pré-requisitos

- Node.js **20+** (recomendado 22)
- npm 10+
- Backend AureBid rodando em `http://localhost:3000` para o modo real

---

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

A aplicação sobe em **http://localhost:3001**, mesma origem esperada pelo CORS do backend.

O projeto inicia em **modo demonstração** (`VITE_USE_MOCKS=true`): o MSW intercepta as chamadas no navegador, o socket é simulado e os dados vêm de fixtures locais. Para consumir o backend real, ajuste o `.env`:

```dotenv
VITE_USE_MOCKS=false
```

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento na porta 3001 |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build na porta 3001 |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run lint` | ESLint em todo o projeto |
| `npm test` | Executa a suíte Vitest uma vez |
| `npm run test:watch` | Vitest em modo watch |
| `npm run msw:init` | Regera o service worker do MSW em `public/` |

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | Base da API, incluindo `/api/v1` |
| `VITE_SOCKET_URL` | origem derivada da API | Origem do Socket.IO, sem o prefixo da API |
| `VITE_USE_MOCKS` | `true` | `true` usa MSW + socket simulado; `false` consome o backend real |
| `VITE_MOCK_LATENCY_MS` | `220` | Latência simulada das respostas do MSW (testes usam `0`) |

---

## Modo demonstração

O modo demo usa **MSW sobre o mesmo contrato HTTP** documentado abaixo. Os componentes não contêm dados falsos: toda a simulação fica isolada em `src/mocks`.

### Contas de demonstração

| Papel | E-mail | Senha |
| --- | --- | --- |
| Licitante | `bidder@aurebid.com` | `bidder123` |
| Licitante (2) | `bidder2@aurebid.com` | `bidder123` |
| Leiloeiro | `auctioneer@aurebid.com` | `auctioneer123` |

### O que o modo demo simula

- Login, cadastro, refresh token, `/auth/me` e logout
- Lotes em todos os estados: `DRAFT`, `SCHEDULED`, `ACTIVE`, `ENDED`, `SETTLED`, `CANCELLED`
- Busca de cartas no catálogo Cardex (fixtures reais em `src/mocks/fixtures/cards.ts`)
- Lances com reserva de saldo, incremento mínimo, bloqueio de lance do próprio leiloeiro e de lote encerrado
- Carteira, depósitos simulados e extrato
- Liquidações e recibos públicos (`rec-demo-2026`, `rec-blastoise-demo`)
- Verificação de integridade da cadeia de auditoria
- Eventos de socket (`bid:new`, `auction:status_change`, `auction:ended`, `auction:timer`)

> **Importante:** no modo demo nenhuma operação movimenta dinheiro real. O banner de demonstração e os avisos nas telas financeiras deixam isso explícito.

Lotes de exemplo úteis:

| Lote | Situação | Uso |
| --- | --- | --- |
| `lot-001` | Ao vivo | Charizard com histórico e disputa |
| `lot-003` | Agendado | Aviso de abertura |
| `lot-005` | Encerrado | Recibo pendente `rec-blastoise-demo` |
| `lot-006` | Liquidado | Recibo concluído `rec-demo-2026` |
| `lot-011` | Rascunho | Gerenciamento do leiloeiro |
| `lot-012` | Cancelado | Estado terminal |

Para recarregar os dados originais, recarregue a página: o banco mock é recriado a cada carga.

---

## Integração com o backend real

### Autenticação

- `POST /auth/login` e `POST /auth/register` retornam `{ user, accessToken, refreshToken }`.
- O **access token fica em memória**; o **refresh token fica em `sessionStorage`**.
- O cliente HTTP anexa `Authorization: Bearer <token>` e, ao receber **401**, tenta **um refresh** em `POST /auth/refresh` e repete a requisição original.
- Se o refresh falhar, a sessão é encerrada e a aplicação redireciona para o login.
- Papéis: `ADMIN`, `AUCTIONEER` e `BIDDER`. Na interface, `AUCTIONEER` aparece como **Leiloeiro** e `BIDDER` como **Licitante**.

### Envelope de resposta

```json
{
  "success": true,
  "data": {},
  "message": "opcional",
  "error": { "code": "ERROR_CODE", "message": "..." },
  "errors": [{ "field": "email", "message": "..." }],
  "meta": { "page": 1, "limit": 12, "total": 30, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

Erros do backend são traduzidos para mensagens em pt-BR em `src/utils/errors.ts`. Campos de formulário recebem erros por `field`.

### Endpoints consumidos

| Área | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` |
| Catálogo / lotes | `GET /catalog/lots`, `GET /catalog/lots/mine`, `GET /catalog/lots/:id`, `POST /catalog/lots`, `PUT /catalog/lots/:id`, `DELETE /catalog/lots/:id` |
| Leilão | `GET /auctions/:id`, `POST /auctions/:id/publish`, `POST /auctions/:id/cancel`, `POST /auctions/:id/end` |
| Lances | `GET /auctions/:id/bids`, `POST /auctions/:id/bids`, `GET /bids` |
| Carteira | `GET /wallets`, `GET /wallets/transactions`, `POST /wallets/deposit` |
| Liquidação | `GET /settlements`, `GET /settlements/public/:token`, `POST /settlements/:id/process` |

### Tempo real

Handshake autenticado por JWT em `auth: { token }`. Eventos do servidor:

- `auction:join` / `auction:leave` (cliente → servidor)
- `auction:state`, `bid:new`, `auction:status_change`, `auction:ended`, `auction:timer` (servidor → cliente)

O cliente atualiza o cache do TanStack Query ao receber eventos. Se o socket cair, a sala continua funcional via polling/refetch e o indicador mostra “Reconectando” ou “Sem sinal ao vivo”.

---

## Rotas

| Rota | Acesso | Tela |
| --- | --- | --- |
| `/` | Pública | Vitrine, destaque e filtros |
| `/lotes/:lotId` | Pública | Sala do lote, lances e histórico |
| `/lotes/:lotId/auditoria` | Pública | Trilha de lances com sequência e hashes |
| `/recibo/:token` | Pública | Recibo público de arremate (sem dados pessoais) |
| `/login` | Somente visitante | Login |
| `/cadastro` | Somente visitante | Cadastro de licitante ou leiloeiro |
| `/carteira` | Autenticada | Saldo, reservas e extrato |
| `/arremates` | Autenticada | Compras e vendas liquidadas |
| `/painel` | `AUCTIONEER` / `ADMIN` | Painel de lotes do leiloeiro |
| `/painel/lotes/novo` | `AUCTIONEER` / `ADMIN` | Cadastro de lote |
| `/painel/lotes/:lotId` | `AUCTIONEER` / `ADMIN` | Gerenciamento e ações do lote |
| `/painel/resultados` | `AUCTIONEER` / `ADMIN` | Resultados de venda e liquidações |
| `*` | Pública | Página 404 |

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

## Lacunas conhecidas e degradação honesta

Estes pontos dependem de endpoints que o backend atual ainda não expõe. O frontend não os simula em produção:

1. **Proxy de busca de cartas** (`GET /catalog/cards`)
   - O backend não expõe o catálogo Cardex. Em modo demo o MSW responde com fixtures. No modo real, o cadastro de lote mostra um aviso e permite preenchimento manual.
   - O frontend **nunca chama a Cardex diretamente**, para não expor credenciais.

2. **Verificação pública de integridade** (`GET /auctions/:id/audit/verify`)
   - O backend só oferece verificação para administradores. A página de auditoria tenta o endpoint e, em 403/404, declara **“Verificação pública indisponível”**.
   - A conferência visual de elos (hash anterior × hash atual) é apenas informativa e **não substitui a verificação criptográfica do servidor**.

3. **Resumo agregado do leiloeiro** (`GET /catalog/lots/mine/summary`)
   - Não existe no backend. `lotsService.summary()` retorna `null` em 403/404/405 e o painel deixa de exibir totais financeiros, usando a lista de lotes como fonte de verdade.

4. **Depósitos e liquidações**
   - A interface apenas solicita a operação ao backend. Conclusão, crédito, débito e comprovantes são definidos pelo servidor.
   - No modo demo esses fluxos são simulados e sinalizados como não financeiros.

5. **Totais de venda**
   - A tela de resultados calcula indicadores a partir das liquidações **retornadas pela API**, apenas para leitura. Não são apresentados como saldo contábil oficial.

---

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

A suíte cobre:

- Proteção de rotas e redirecionamento de sessão
- Validação acessível de formulários e login
- Estados da sala do lote (agendado, encerrado, liderando, saldo insuficiente)
- Recibo público sem exposição de e-mails/IDs
- Auditoria nos estados `VERIFIED`, `FAILED` e `UNAVAILABLE`

Os testes rodam com MSW em memória, sem chamadas externas.

---

## Acessibilidade e responsividade

- Formulários com `label` associado, `aria-describedby` para erros, foco visível e mensagens anunciadas.
- Diálogos e menus Radix com navegação por teclado.
- Regiões de status com `role="timer"`/`aria-live` apropriado para contagens.
- Layout responsivo do mobile ao desktop, com menu móvel, tabelas/listas adaptáveis e imagens com fallback.
- Respeito a `prefers-reduced-motion` nas animações globais.

---

## Licença

Projeto de demonstração técnica. Pokémon e nomes de coleções pertencem aos respectivos titulares.
