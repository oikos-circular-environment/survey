# Integração e entrega contínuas

## Fluxo

```
feature/*  →  development  →  production
   PR           PR              deploy
```

| Evento | O que acontece |
|---|---|
| Pull request para `development` ou `production` | GitHub Actions roda lint, checagem de tipos e testes (`.github/workflows/ci.yml`) |
| Push em `development` | O mesmo CI roda, e a Vercel publica um deploy de pré-visualização |
| Push em `production` | O mesmo CI roda, e a Vercel publica em produção, em `survey.oikos.company` |
| Push em `production` ou tag `v*` | Os pacotes `survey-db` e `survey-api` são publicados no GitHub Packages (`publish-packages.yml`) |

O deploy é feito pela integração da Vercel com o GitHub, no projeto `oikos-survey`. Não há token da Vercel no repositório, e não existe passo de deploy no GitHub Actions: quem publica é a própria Vercel, a partir do push.

## O que o CI executa

1. `bun install --frozen-lockfile`
2. Concessão de privilégio no MySQL de serviço, para o harness criar os bancos efêmeros `survey_test_<uuid>`
3. `bunx biome ci .`, que cobre formatação e lint
4. `bun run check-types`, em todos os pacotes
5. `bun run test`, que roda as suítes de `packages/db`, `packages/api` e `apps/web`

O serviço de banco é um MySQL 8.4, e as variáveis de ambiente do job são de teste, sem relação com as de produção.

## Migrações de banco

As migrações não rodam no pipeline. Depois de um deploy que altere o schema, aplique com:

```bash
cd packages/db
DATABASE_URL="<url de produção>" bunx drizzle-kit migrate
```

## Proteção das branches

O CI só bloqueia merge se as branches `development` e `production` exigirem a verificação "Lint, tipos e testes" como obrigatória, em Settings, Branches, Branch protection rules. Sem isso, o CI roda e reporta, mas não impede o merge nem o deploy.
