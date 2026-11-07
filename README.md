<p align="center">
  <img src=".github/assets/logo.png" width="96" alt="Logo do Oikos">
</p>

<h1 align="center">Oikos Survey</h1>

<p align="center">
  <a href="https://github.com/oikos-circular-environment/survey/actions/workflows/ci.yml"><img src="https://github.com/oikos-circular-environment/survey/actions/workflows/ci.yml/badge.svg?branch=development" alt="CI"></a>
  <img src="https://img.shields.io/badge/bun-1.3-3F6B2A?logo=bun&logoColor=white" alt="Bun 1.3">
  <img src="https://img.shields.io/badge/next.js-16-3F6B2A?logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/tRPC-11-3F6B2A?logo=trpc&logoColor=white" alt="tRPC 11">
  <img src="https://img.shields.io/badge/ISO-9241--11-3F6B2A" alt="ISO 9241-11">
</p>

<p align="center">
  <strong>Instrumento e painel do teste de usabilidade do aplicativo Oikos.<br>
  Mede eficácia, eficiência e satisfação de quem usa o app, tarefa por tarefa.</strong>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/survey-hero-dark.jpg">
    <img src=".github/assets/survey-hero-light.jpg" alt="Visão geral do painel com eficácia, eficiência, satisfação e nível de usabilidade" width="100%">
  </picture>
  <br>
  <sub>Painel com dados fictícios gerados por <code>db:seed:demo</code>. Os números não são resultados da pesquisa.</sub>
</p>

## Sobre o Oikos

O Oikos é uma plataforma de economia circular de resíduos sólidos. Ela conecta quem gera resíduo (moradores, empresas e órgãos públicos) a quem transforma esse resíduo em recurso: cooperativas, recicladoras, ecopontos e coletores.

O produto tem três frentes:

- **Pontos de coleta e mercado.** Mapa de empresas e ecopontos com os resíduos que cada um aceita, horários de funcionamento e preço pago por quilo.
- **Denúncias ambientais.** Registro de descarte irregular com foto, vídeo e localização. A comunidade vota se a denúncia foi resolvida e a moderação acompanha o andamento.
- **Modo pesquisa.** Teste de usabilidade aplicado dentro do próprio aplicativo, usado na avaliação da dissertação de mestrado que originou o projeto.

Este repositório é o modo pesquisa: define o protocolo do teste, recebe os dados das sessões feitas no app e calcula os indicadores no painel do pesquisador.

## Como a avaliação funciona

O teste é autoaplicado. O participante executa as tarefas no próprio aparelho, dentro do app, sem um avaliador ao lado. A sessão passa por consentimento, caracterização do participante, escolha da persona (o papel dele na cadeia de resíduos), execução das tarefas e um questionário ao final de cada etapa. O app registra quando cada tarefa começa e quando o sinal de sucesso aparece.

A usabilidade segue a definição da ISO 9241-11, operacionalizada pelo método de Lima, Oliveira e Santana (2013):

| Indicador | Cálculo |
|---|---|
| Eficácia (Te) | tarefas concluídas ÷ tarefas iniciadas |
| Eficiência (Tf) | 1 − tempo médio ÷ (tempo máximo − tempo mínimo) |
| Satisfação (Ts) | (média da escala de satisfação − 1) ÷ 4 |
| Nível de usabilidade (Us) | (Te + Tf + Ts) ÷ 3 |

O nível de usabilidade é lido em faixas de 0,25: péssimo, satisfatório, bom e ótimo. O painel também cruza os resultados por suíte, por tarefa e por persona, e reúne as respostas sobre heurísticas de Nielsen, itens do domínio de resíduos e comentários livres.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/survey-tasks-dark.jpg">
    <img src=".github/assets/survey-tasks-light.jpg" alt="Tabela de resultados por tarefa com eficácia, eficiência e tempo médio" width="100%">
  </picture>
  <br>
  <sub>Resultados por tarefa, também com dados fictícios.</sub>
</p>

O protocolo é versionado. Cada versão publicada fixa as suítes, tarefas e perguntas, e o app sempre executa a versão ativa. Isso mantém comparáveis as sessões coletadas sob o mesmo protocolo.

## Ecossistema

| Repositório | Papel | Stack principal |
|---|---|---|
| [api](https://github.com/oikos-circular-environment/api) | API REST, regras de negócio, autenticação, filas e armazenamento | Fastify, Prisma, PostgreSQL, Redis, MinIO |
| [web](https://github.com/oikos-circular-environment/web) | Site institucional e painel web para organizações e moderação | Next.js, Tailwind CSS, MapLibre |
| [mobile](https://github.com/oikos-circular-environment/mobile) | Aplicativo iOS e Android | Expo, React Native |
| **survey** (este) | Instrumento e painel do teste de usabilidade | Next.js, tRPC, Drizzle, MySQL |
| devops (privado) | Infraestrutura, deploy e observabilidade | Terraform, Docker Compose, Nginx, Grafana |

## Arquitetura

```mermaid
flowchart LR
  subgraph Clientes
    M["mobile<br/>Expo / React Native"]
    W["web<br/>Next.js"]
  end
  M -- "REST (oikos-sdk)" --> A["api<br/>Fastify"]
  W -- "REST (oikos-sdk)" --> A
  A --> P[("PostgreSQL")]
  A --> R[("Redis<br/>BullMQ")]
  A --> S[("MinIO<br/>S3")]
  A --> E["Resend<br/>e-mail"]
  M -- "tRPC (survey-api)" --> SV["survey<br/>Next.js + tRPC"]
  SV --> MY[("MySQL")]
  PQ["Pesquisador"] --> SV
```

O survey é independente da API do Oikos. Tem banco próprio e autenticação própria, e o app fala com ele por tRPC usando o pacote `@oikos-circular-environment/survey-api`, publicado a partir deste repositório. As chamadas do app são autorizadas por chave de cliente. O painel é restrito à conta do pesquisador.

## Stack

| Área | Tecnologia |
|---|---|
| Monorepo | Bun 1.3 e Turborepo |
| Aplicação | Next.js 16 com React 19 |
| API | tRPC 11 |
| Banco de dados | MySQL 8.4 com Drizzle ORM |
| Autenticação | Better Auth |
| Interface | Tailwind CSS 4 e shadcn/ui |
| Testes | `bun test` |
| Qualidade | Biome e Lefthook |

## Estrutura

```
apps/
  web/              painel do pesquisador e rota /api/trpc
packages/
  api/              routers tRPC (publicado como @oikos-circular-environment/survey-api)
  db/               schema, migrations e seeds do Drizzle (publicado como @oikos-circular-environment/survey-db)
  env/              validação das variáveis de ambiente
  ui/               componentes shadcn compartilhados
  config/           configuração compartilhada de TypeScript
docs/               CI/CD, operação do banco de produção e relatório da avaliação
```

## Rodando localmente

Pré-requisitos: Bun 1.3 e Docker.

```bash
bun install
bun run db:start
```

Crie `apps/web/.env.local` com as variáveis abaixo:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | conexão MySQL, por exemplo `mysql://user:password@localhost:3306/survey` |
| `BETTER_AUTH_SECRET` | segredo da sessão; use um valor aleatório longo, como a saída de `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL pública do painel, por exemplo `http://localhost:3001` |
| `CORS_ORIGIN` | origem permitida, normalmente a mesma do painel |
| `CLIENT_API_KEY` e `NEXT_PUBLIC_CLIENT_API_KEY` | chave de cliente da API tRPC, com o mesmo valor nas duas |
| `ADMIN_SEED_EMAIL` e `ADMIN_SEED_PASSWORD` | conta do pesquisador criada pelo seed |

Depois aplique as migrations, popule o banco e suba o painel:

```bash
bun run db:migrate
bun run db:seed        # protocolo, suítes, tarefas e perguntas
bun run db:seed:demo   # sessões fictícias para ver o painel com dados
bun run db:seed:auth   # conta do pesquisador
bun run dev:web
```

O painel fica em `http://localhost:3001`.

## Testes e qualidade

```bash
bun run test         # testes de todos os pacotes
bun run check-types  # TypeScript
bun run check        # Biome
```

## Colaboração

Contribuições são bem-vindas. O fluxo é o mesmo em todos os repositórios do Oikos:

1. **Comece por uma issue.** Descreva o problema ou a proposta antes de abrir código.
2. **Crie a branch a partir de `development`**, com o nome `<número-da-issue>-<descrição-curta>`, por exemplo `142-exportar-por-persona`. Quem não faz parte da organização trabalha a partir de um fork.
3. **Faça commits pequenos** no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), como `feat(dashboard): ...` ou `fix(protocol): ...`.
4. **Abra o pull request para `development`.** A descrição tem duas seções: `## Contexto` e `## O que foi feito`. O que ficou pendente vira uma nova issue.
5. **`production` só recebe código vindo de `development`**, também por pull request.

Os hooks do Lefthook rodam o Biome no `pre-commit` e bloqueiam push direto em `development` e `production`. Não pule os hooks com `--no-verify`.

Mudanças no protocolo (tarefas, perguntas, critérios de sucesso) alteram o que está sendo medido. Elas precisam de uma nova versão do protocolo e não devem ser misturadas com correções de código no mesmo pull request.
