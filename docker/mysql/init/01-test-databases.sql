-- Permite que o usuário da aplicação crie e apague os bancos efêmeros de teste.
--
-- O harness de teste sobe um banco por suíte, com nome `survey_test_<uuid>`, e o
-- derruba ao fim. Sem esta concessão o `CREATE DATABASE` falha, porque a imagem oficial
-- do MySQL concede ao usuário de `MYSQL_USER` privilégio apenas sobre `MYSQL_DATABASE`.
--
-- O curinga cobre só o prefixo de teste: o usuário continua sem poder tocar em
-- `mysql`, `sys` ou em qualquer outro banco do servidor.
--
-- Scripts em /docker-entrypoint-initdb.d rodam uma única vez, na inicialização do
-- volume. Depois de alterar este arquivo é preciso recriar o volume:
--   docker compose down -v && docker compose up -d mysql
GRANT ALL PRIVILEGES ON `survey\_test\_%`.* TO 'user'@'%';
FLUSH PRIVILEGES;
