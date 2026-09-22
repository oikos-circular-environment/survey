# Banco de dados de produção

## Provedor escolhido: TiDB Cloud Serverless (tier Starter)

**Por quê:**
- Free tier permanente (não é trial): 5GB de storage por linha, 5GB colunar, 50M Request Units/mês, até 5 instâncias grátis por organização, sem cartão de crédito.
- Compatível com o protocolo MySQL, então não exigiu trocar o ORM (Drizzle) nem o dialeto do schema (`mysql-core`, ver `packages/db/drizzle.config.ts`).
- Tem CLI oficial (`ticloud`) que permite provisionar tudo via terminal/scripts, sem depender do console web, o que é importante pra reprodutibilidade e automação futura.

**Alternativas descartadas nesta rodada e por quê:**
- **PlanetScale**: sem tier grátis desde abril/2024 (mínimo $39/mês). Era a única integração nativa de MySQL no Marketplace da Vercel, mas isso não compensa o custo.
- **Railway**: o crédito grátis ($1/mês após o trial) não sustenta um banco além de poucos dias.
- **RDS (AWS) / Cloud SQL (GCP)**: ~US$10–18/mês na menor instância viável; mais caro que necessário nesta fase do projeto.

**Ressalva importante:** TiDB é compatível com o *protocolo* MySQL, mas não é MySQL de verdade. É um banco distribuído com engine SQL própria. Isso já gerou incompatibilidades reais de DDL ao aplicar as migrations do Drizzle (detalhado abaixo). Se no futuro uma migration nova travar por incompatibilidade de DDL que não seja trivial de contornar, a alternativa é migrar para MySQL genuíno (ex: **Aiven**, que também tem free tier permanente, com 1GB storage/RAM).

## Cluster provisionado

| Campo | Valor |
|---|---|
| Nome | `oikos-survey-prod` |
| Cluster ID | `10179873877071950324` |
| Provider / Região | AWS `sa-east-1` (São Paulo) |
| Tier | Starter (serverless, free) |
| Host público | `gateway01.sa-east-1.prod.aws.tidbcloud.com` |
| Porta | `4000` |
| Database | `survey` |
| Spending limit | **US$ 0/mês**, trava o cluster para nunca sair do free tier (rejeita novas conexões/writes em vez de gerar cobrança se a quota for excedida) |
| Backup automático | Habilitado, retenção de 1 dia (padrão do tier Starter) |
| Usuário de aplicação | `<prefixo-do-cluster>.app`, role `role_admin`. Ver prefixo real com `ticloud serverless describe --cluster-id 10179873877071950324` |

## Como foi provisionado (comandos usados)

```bash
# 1. Instalar o CLI
curl https://raw.githubusercontent.com/tidbcloud/tidbcloud-cli/main/install.sh | sh

# 2. Autenticar (abre device flow no navegador)
ticloud auth login

# 3. Confirmar projeto padrão da organização
ticloud project list

# 4. Ver regiões disponíveis para o tier Starter
ticloud serverless region

# 5. Criar o cluster com gasto travado em zero (garante free tier)
ticloud serverless create \
  --display-name "oikos-survey-prod" \
  --region "aws-sa-east-1" \
  --spending-limit-monthly 0

# 6. Criar o usuário SQL de aplicação
ticloud serverless sql-user create \
  --cluster-id "10179873877071950324" \
  --user "app" \
  --password "<gerada com openssl rand -base64 24>" \
  --role "role_admin"

# 7. Criar o database
# (via conexão mysql2 direta, ver script de exemplo abaixo)
CREATE DATABASE IF NOT EXISTS survey;

# 8. Aplicar as migrations do Drizzle apontando DATABASE_URL para o cluster
cd packages/db
DATABASE_URL='mysql://<user>:<senha>@gateway01.sa-east-1.prod.aws.tidbcloud.com:4000/survey?ssl={"minVersion":"TLSv1.2"}' \
  bunx drizzle-kit migrate
```

Consultar/gerenciar o cluster depois de criado:

```bash
ticloud serverless list -p <project-id> -o json
ticloud serverless describe --cluster-id 10179873877071950324
ticloud serverless sql-user list --cluster-id 10179873877071950324
```

## Incompatibilidades MySQL vs TiDB encontradas ao migrar

Rodar as migrations do Drizzle (escritas/testadas contra MySQL real via Docker) contra o TiDB expôs duas diferenças reais de DDL:

1. **`ALTER TABLE ... MODIFY COLUMN` removendo `AUTO_INCREMENT`** (migration `0006_participant_code_ulid.sql`, coluna `usability_sessions.participant_code`), válido em MySQL, mas o TiDB bloqueia por padrão com o erro `Unsupported modify column: can't remove auto_increment without @@tidb_allow_remove_auto_inc enabled`.
   **Contorno:** setar a variável de sessão antes de rodar essa migration, sem alterar o SQL:
   ```sql
   SET tidb_allow_remove_auto_inc = 1;
   ```

2. **`DEFAULT (now())` em colunas `timestamp(3)`** (migration `0007_motionless_lyja.sql`, tabelas do Better Auth: `account`, `session`, `user`, `verification`), sintaxe válida em MySQL 8, rejeitada pelo TiDB com `ER_INVALID_DEFAULT`.
   **Correção aplicada:** substituído por `DEFAULT CURRENT_TIMESTAMP(3)` diretamente no arquivo de migration, sintaticamente equivalente e válido tanto em MySQL quanto TiDB, então não quebra o ambiente local (Docker/MySQL).

Se aparecerem novas incompatibilidades de DDL em migrations futuras, documentar aqui o padrão do problema e a correção, para não repetir a investigação.

## Variáveis de ambiente de produção

Configurar no painel da Vercel (Project Settings → Environment Variables), **nunca commitadas em `.env`**:

| Variável | Valor / origem | Observação |
|---|---|---|
| `DATABASE_URL` | `mysql://<user>:<senha>@gateway01.sa-east-1.prod.aws.tidbcloud.com:4000/survey?ssl={"minVersion":"TLSv1.2"}` | TLS obrigatório, sem `ssl` a conexão é recusada pelo TiDB |
| `BETTER_AUTH_SECRET` | gerado com `openssl rand -hex 32` | nunca reaproveitar o valor de dev (`dev-only-secret-change-me-...`) |
| `CLIENT_API_KEY` | gerado com `openssl rand -hex 24` | mesmo valor em `NEXT_PUBLIC_CLIENT_API_KEY` |
| `NEXT_PUBLIC_CLIENT_API_KEY` | igual ao `CLIENT_API_KEY` | fica visível no bundle do navegador por natureza, é barreira baixa contra acesso programático direto, não segredo forte (ver `packages/api/src/lib/client-key.ts`) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://survey.oikos.company` | **nenhuma mudança de código necessária**, o Better Auth 1.6.x já faz merge automático dessa env var (separada por vírgula se houver mais de um domínio) com o array `trustedOrigins` hardcoded em `packages/db/src/auth/config.ts` (que serve só o `localhost:3001` de dev). Ver `better-auth/dist/context/helpers.mjs`, função `getTrustedOrigins`. |
| `ADMIN_SEED_EMAIL` | e-mail real do admin único (S09: sem cadastro público) | usado só por `bun run db:seed:auth` |
| `ADMIN_SEED_PASSWORD` | senha real, gerada à parte | usado só por `bun run db:seed:auth`, nunca reaproveitar a senha de dev (`!Alpha742*`) |

**Achado à parte, não bloqueante:** `CORS_ORIGIN` está declarado no schema de env (`packages/env/src/server.ts`) mas não encontramos nenhum uso real no código na data desta análise (2026-08-04/05), possível configuração morta. Revisar antes de assumir que ela faz algo em produção.

## Segurança / pendências para revisitar depois

- O endpoint público do cluster aceita conexões de qualquer IP (`0.0.0.0/0`) por padrão, protegido só por usuário/senha + TLS. Considerar restringir authorized networks (`ticloud serverless authorized-network`) aos IPs de saída da Vercel, ou usar Private Link, se/quando isso for viável.
- Segredos gerados devem ser guardados em um cofre (gerenciador de senhas / env vars da Vercel), nunca commitados neste repositório.
- Retenção de backup do tier Starter é de só 1 dia. Se isso for insuficiente para o RPO desejado, é motivo pra reconsiderar o provedor ou tier.
