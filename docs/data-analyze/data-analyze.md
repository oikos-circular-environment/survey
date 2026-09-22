# Análise dos dados do Teste de Usabilidade (protocolo oikos-walkthrough v11)

Documento de trabalho que antecede a escrita final dos resultados no Overleaf (`mestrado/overleaf/textuais/Avaliacao.tex`). Registra a metodologia de cálculo, a auditoria do dashboard do survey, as correções feitas nos dados e no código e os resultados obtidos com os dados corrigidos.

Base de dados analisada: snapshot de produção de 17/09/2026 (`snapshots/survey_prod_20260917_155217.sql`), complementado pelos dois participantes de 18/09/2026 copiados da produção (sessões, execuções, respostas e eventos). Data do recorte: 22/09/2026.

## 1. Contexto

O Teste de Usabilidade segue o protocolo descrito em `mestrado/reference/plans/oikos-walkthrough.md`. É autoaplicado dentro do próprio aplicativo Oikos, sem avaliador presente. O participante escolhe a persona, responde a caracterização, executa as tarefas no app real e responde o questionário pós-suíte. A conclusão de cada tarefa e o tempo ativo de execução são capturados automaticamente pelo aplicativo, a partir de sinais de sucesso (chamada de API, tela visitada ou evento de interface).

O documento do protocolo ainda descreve a versão 9 (5 suítes, 20 tarefas). A versão vigente é a **11**, publicada em 31/08/2026, que reduziu o instrumento a **uma única suíte (S1, "Teste de Usabilidade") com 8 tarefas, comum a todas as personas**:

| Código | Tarefa | Sinal de sucesso |
|---|---|---|
| T8 | Usar os filtros de Pontos de Coleta | `GET /v1/market` com raio diferente do inicial, categoria ou busca por texto |
| T11 | Visualizar os detalhes de uma empresa | tela `/market/[companyId]` |
| T12 | Visualizar o mapa de denúncias | `GET /v1/complaints/map` ou tela `/complaints` |
| T13 | Usar os filtros de Denúncias | `GET /v1/complaints/map` com filtro de status, categoria ou periculosidade |
| T16 | Criar uma denúncia | `POST /v1/complaints` **e** `POST /v1/complaints/:id/attachments` |
| T17 | Votar em uma denúncia | `POST /v1/complaints/:id/votes` |
| T18 | Postar uma resolução | `POST /v1/complaints/:id/resolutions` |
| T19 | Abrir uma denúncia sua na lista | evento `complaint.opened` com `source: "list"` |

O objetivo exibido ao participante na v11 diz expressamente que "não existe ordem certa". Esse ponto é relevante para a seção 7.3.

### 1.1. Conversão dos dados da v9 para a v11

Oito participantes executaram a versão 9 do protocolo, antes da publicação da v11. Por decisão metodológica, esses dados foram **convertidos para a v11 como se os participantes tivessem executado a v11 desde o início**. A conversão (script `packages/db/src/scripts/sync-v9-into-v11.ts`) é feita no próprio registro. A sessão mantém o identificador e o código de participante, passa a apontar para a v11 e recebe as seguintes transformações:

1. Das tarefas executadas na v9, permanecem só as 8 que existem na v11. T8, T11, T12 e T13 vinham da suíte S1 da v9. T16 a T19 vinham da suíte S6 (Cidadão). As demais tarefas da v9 (T1 a T7, T9, T10, T14, T15 e T20) são descartadas.
2. Cada execução de tarefa mantém resultado, tempo ativo e forma de detecção originais.
3. Tarefas da v11 que o participante nunca viu na v9 **não recebem execução**. É o caso de T16 a T19 para os dois participantes da persona Empresa comum, cujo roteiro na v9 era S1 e S2. Essas tarefas ficam fora do denominador da eficácia, em vez de contarem como sucesso ou fracasso inventado.
4. O questionário pós-suíte da v11 recebe, para cada pergunta, a média arredondada das respostas das suítes v9 que forneceram tarefas (S1 e S6, ou só S1). Para `error_occurred`, vale "Sim" se qualquer uma das suítes teve erro. O comentário final é mantido.
5. O tempo ativo da suíte v11 é a soma dos tempos das tarefas mantidas. O tempo total decorrido (`wall_ms`) é a soma dos tempos totais das suítes v9 contribuintes.
6. Os eventos de telemetria das tarefas mantidas passam a ser da suíte S1, e os demais são descartados.

Uma versão anterior do script gerava cópias com prefixo `V9SYNC-` sem apagar as sessões originais. Com isso, os 8 participantes contavam duas vezes, as cópias ficavam sem tempo (0 ms) e sem respostas, e as tarefas ausentes eram preenchidas como concluídas. Essas cópias foram removidas.

## 2. Metodologia de referência (Lima, Oliveira e Santana, 2013)

O cálculo de usabilidade adotado parte de Lima et al. (2013), que avaliaram a Biblioteca Virtual em Saúde (BVS) com 15 participantes e 10 tarefas, operacionalizando as três dimensões da ISO 9241-11 como taxas adimensionais entre 0 e 1.

### 2.1. Fórmulas

**Eficácia (Te).** Razão entre tarefas concluídas e tarefas realizadas.

$$T_e = \frac{\sum TAR_c}{\sum TAR}$$

**Eficiência (Tf).** Obtida do tempo médio das tarefas concluídas, comparado com o menor e o maior tempo observado em qualquer tarefa.

$$t_{méd} = \frac{\sum t}{\sum TAR_c} \qquad T_f = 1 - \frac{t_{méd}}{t_{máx} - t_{mín}}$$

**Satisfação (Ts).** Cada resposta Likert é codificada de 0 a 3 (péssimo, satisfatório, bom, ótimo). A taxa de cada usuário é a soma das suas respostas dividida pela soma máxima possível (30, com 10 tarefas), e a taxa geral é a média entre usuários.

$$T_{su} = \frac{S_u}{S_{máx}} \qquad T_s = \frac{\sum T_{su}}{U}$$

**Nível de usabilidade (Us).** Média simples das três taxas, sem pesos.

$$U_s = \frac{T_e + T_f + T_s}{3}$$

O intervalo de 0 a 1 é dividido em quatro faixas iguais, que também se aplicam a cada taxa isoladamente: péssimo (0 ≤ Us < 0,25), satisfatório (0,25 ≤ Us < 0,5), bom (0,5 ≤ Us < 0,75) e ótimo (0,75 ≤ Us ≤ 1).

### 2.2. Exemplo com os números do artigo

A Tabela 1 do artigo lista as 10 tarefas. A coluna "Nº Tarefas Concluídas (Eficácia)" traz, em cada linha, o **número de usuários que concluíram aquela tarefa**, e não um número de subtarefas. Na tarefa 1 ("Realizar uma busca livre no site da BVS"), o valor 12 significa que 12 dos 15 participantes a concluíram. A soma da coluna dá o numerador da eficácia.

- Te = 119 / 150 = 0,79 (150 = 15 participantes × 10 tarefas). Nível ótimo.
- Tf, com tmín = 1 min, tmáx = 16 min e tméd = 3,15 min: 1 − 3,15 / (16 − 1) = 0,79. Nível ótimo.
- Ts = 0,47. Nível satisfatório.
- Us = (0,79 + 0,78 + 0,47) / 3 = 0,68.

### 2.3. Inconsistências do próprio artigo

A leitura detalhada do artigo mostra problemas que convém não reproduzir:

1. O cabeçalho "Nº Tarefas Concluídas" sugere contagem de tarefas, mas a coluna conta usuários por tarefa (máximo 15). A média de 11,9 é de usuários por tarefa.
2. A terceira coluna repete o cabeçalho "Tempo Médio em Minutos (Eficiência)", mas contém o escore de satisfação (soma 83).
3. A taxa de eficiência aparece como 0,78, depois como 0,69, e o Us usa 0,78. Pela fórmula, o valor é 0,79.
4. O Gráfico 1 é intitulado "Eficência de usabilidade", mas mostra a eficácia (79% de tarefas concluídas).
5. O Us de 0,68 cai na faixa "bom" das próprias faixas do artigo, mas o texto conclui que a BVS tem "ótimo nível de usabilidade".
6. A fórmula de Tf não subtrai tmín do numerador. Por isso Tf não chega a 1 mesmo quando tméd = tmín, e pode ficar negativa quando tméd > tmáx − tmín.

## 3. Nossa adaptação

O cálculo do Oikos é semelhante ao de Lima et al., mas não idêntico. As diferenças são:

| Aspecto | Lima et al. (2013) | Oikos (v11) |
|---|---|---|
| Aplicação | Laboratório, com avaliador | Autoaplicada no app de produção |
| Conclusão da tarefa | Anotada pelo avaliador | Sinal de sucesso detectado pelo app |
| Tarefa não concluída | Não concluiu | O participante pulou a tarefa ou saiu da etapa sem o sinal |
| Tempo | Minutos por tarefa, cronometrados | Tempo ativo medido pelo app (pausas não contam) |
| Satisfação | Uma resposta por tarefa, escala 0 a 3 | Uma resposta por suíte (pós-etapa), escala 1 a 5 |
| Normalização da satisfação | Su / Smáx | (média − 1) / 4 |
| Estrutura | 10 tarefas | 1 suíte com 8 tarefas |

Três pontos precisam de explicação:

1. **A satisfação não está vinculada à tarefa.** A pergunta `satisfaction` ("Como você avalia sua satisfação com esta etapa?") é feita uma vez, ao fim da suíte, e o texto de apoio pede que o participante pense na experiência de usar o aplicativo na etapa como um todo. Como a v11 tem uma única suíte, cada participante tem uma única resposta de satisfação, e Tsu equivale à satisfação da sessão. Por isso a tabela por tarefa (seção 6.2) não tem coluna de satisfação, diferente da Tabela 1 do artigo.
2. **Normalização.** A escala de 1 a 5 é convertida para 0 a 1 por (x − 1) / 4, de modo que 1 (Péssimo) vale 0 e 5 (Ótimo) vale 1. Com uma resposta por participante, Ts = média das taxas por participante, que é o mesmo que ((média bruta) − 1) / 4.
3. **Eficiência.** O Tf mantém a forma literal do artigo, 1 − tméd / (tmáx − tmín), para permitir comparação direta. tméd é a média do tempo ativo das tarefas **concluídas**, e tmín e tmáx são o menor e o maior tempo entre todas as tarefas concluídas do recorte. Tarefas concluídas com tempo registrado igual a zero ficam fora do cálculo, porque indicam falha de medição do app e não execução instantânea. São 5 casos, todos de sessões convertidas da v9 (4 de `01KZE5T1…` e 1 de `01M0D235…`).

## 4. Critérios de inclusão

Entram nas métricas apenas as sessões com status **COMPLETED** na versão 11 do protocolo. São 16 sessões, sendo 8 nativas da v11 e 8 convertidas da v9.

Ficam fora 5 sessões com status IN_PROGRESS, todas de participantes que se declararam Cidadão. Quatro delas não chegaram a executar nenhuma tarefa. A quinta (`01M1G0YB…`, 02/09) registrou as 8 tarefas como não concluídas e não terminou o questionário. Não há sessões ABANDONED nem DISCARDED no recorte.

Dentro das sessões concluídas, uma tarefa entra no denominador (ΣTAR) quando tem execução finalizada com resultado registrado. Tarefas que o participante nunca viu (seção 1.1, item 3) não entram.

## 5. Auditoria do dashboard

Todas as telas do painel foram conferidas contra o banco de dados. Os problemas encontrados foram corrigidos no código (`packages/db/src/repositories/`, `packages/api/src/use-cases/`, `apps/web/src/app/dashboard/`). Com isso, os valores exibidos passaram a coincidir com o cálculo independente por SQL do Apêndice A.

### 5.1. Problemas encontrados

1. **Nenhuma consulta filtrava o status da sessão.** Sessões em andamento, abandonadas ou descartadas entravam em todas as métricas. Na tela Tarefas, por exemplo, cada tarefa mostrava 17 tentativas quando havia 16 sessões concluídas. A 17ª era a sessão em andamento que registrou 8 tarefas não concluídas.
2. **A contagem de sessões e participantes não filtrava a versão do protocolo.** O card "Total de sessões" mostrava 29, somando as 8 sessões originais da v9 com as 8 cópias `V9SYNC-` e as 21 da v11. Na tela Personas, Cidadão aparecia com 23 participantes e Empresa comum com 4.
3. **A eficácia da Visão geral, de Suítes e de Personas usava o resultado da suíte, e não o das tarefas.** O resultado da suíte vale YES só quando todas as tarefas foram concluídas, e PARTIAL contava como fracasso. Com uma única suíte, a "eficácia" virava a proporção de sessões com 8/8, que não é a Te de Lima. Isso explica a Empresa de reciclagem com 0% mesmo tendo concluído 7 de 8 tarefas. A tela Tarefas usava o resultado das tarefas, então as telas não eram conciliáveis.
4. **A eficiência usava o tempo da suíte inteira** nas telas agregadas e o tempo de todas as execuções (concluídas ou não) na tela Tarefas. Os limites tmín e tmáx eram calculados sem filtro de versão, com as cópias `V9SYNC-` de 0 ms forçando tmín = 0.
5. **O Us da Visão geral era calculado sobre médias de suítes** e rotulado como "média das suítes". Suítes sem execução entravam com Te = 0 e Tf = 0.
6. **A satisfação ausente tinha dois tratamentos.** Em Suítes e Personas ela entrava como Ts = 0, o que derrubava o Us (Empresa de reciclagem com Us 0,19 e Órgão público com 0,33). Na Visão geral ela era excluída.
7. **Não havia testes** para agregação, filtro de status ou filtro de versão.

### 5.2. Correções

1. Todas as consultas de métrica passaram a usar o mesmo recorte: sessões da versão analisada com status COMPLETED (`packages/db/src/repositories/study-scope.ts`). Isso vale para Visão geral, Suítes, Tarefas, Personas, Caracterização, Heurísticas, Itens de domínio e Comentários.
2. A Te passou a ser ΣTARc / ΣTAR sobre as execuções de tarefa, em todas as telas.
3. O Tf passou a usar o tempo das tarefas concluídas (tempo > 0), com tmín e tmáx do recorte inteiro, em todas as telas.
4. A Ts passou a ser a média, entre sessões, da taxa (média − 1) / 4 de cada sessão.
5. O Us da Visão geral passou a ser global, calculado sobre todas as tarefas e respostas do recorte.
6. Quando um grupo não tem dado (persona sem participantes, grupo sem tarefa concluída cronometrada ou sem resposta de satisfação), a métrica e o Us aparecem vazios no painel, em vez de 0 e "Péssimo".
7. O card de sessões mostra o total da versão por status (21: 16 completas e 5 em andamento) e deixa explícito que as métricas usam as 16 concluídas.
8. A tela Tarefas passou a seguir o formato da Tabela 1 do artigo: quantos participantes realizaram, quantos concluíram, eficácia, tempo médio das conclusões e eficiência.
9. Testes novos em `packages/api/src/use-cases/get-overview.test.ts`, `get-tasks.test.ts` e `get-suites.test.ts` cobrem o filtro de status, a Te por tarefa quando o resultado da suíte diverge, o tempo só das conclusões e a satisfação ausente.

A tela Testadores continua listando sessões de todos os status, por ser uma tela de gestão e não de métrica. As telas Protocolo e Versões do protocolo só exibem definições.

### 5.3. Impacto nos números

| Indicador | Dashboard antes | Depois das correções |
|---|---|---|
| Sessões consideradas | 29 (24 completas, 5 em andamento) | 16 completas (de 21 na v11) |
| Eficácia (Te) | 0,59 | 0,71 |
| Eficiência (Tf) | 0,88 | 0,80 |
| Satisfação (Ts) | 0,82 | 0,88 |
| Nível de usabilidade (Us) | 0,76 (ótimo) | 0,80 (ótimo) |

## 6. Resultados

### 6.1. Participantes

As 16 sessões concluídas se distribuem entre 12 Cidadãos, 2 Empresas comuns, 1 Empresa de reciclagem e 1 Órgão público. Nenhum participante escolheu a persona Coletor(a). A coleta vai de 07/08/2026 a 18/09/2026.

### 6.2. Resultados por tarefa

| Tarefa | Realizaram | Concluíram (Eficácia) | Te | Tempo médio (min) | Tf |
|---|---|---|---|---|---|
| T8 Usar os filtros de Pontos de Coleta | 16 | 12 | 0,75 | 0,95 | 0,83 |
| T11 Visualizar os detalhes de uma empresa | 16 | 12 | 0,75 | 0,36 | 0,94 |
| T12 Visualizar o mapa de denúncias | 16 | 13 | 0,81 | 0,50 | 0,91 |
| T13 Usar os filtros de Denúncias | 16 | 11 | 0,69 | 0,70 | 0,88 |
| T16 Criar uma denúncia | 14 | 9 | 0,64 | 2,96 | 0,48 |
| T17 Votar em uma denúncia | 14 | 10 | 0,71 | 0,56 | 0,90 |
| T18 Postar uma resolução | 14 | 9 | 0,64 | 2,31 | 0,60 |
| T19 Abrir uma denúncia sua na lista | 14 | 9 | 0,64 | 1,25 | 0,78 |
| **Total** | **120** | **85** | **0,71** | **1,13** | **0,80** |

As tarefas T16 a T19 têm 14 realizações porque os dois participantes convertidos da persona Empresa comum não passaram por elas (seção 1.1). O tempo médio total (1,13 min, ou 67,7 s) é a média das 80 conclusões cronometradas, e não a média das linhas. As tarefas de escrita (criar denúncia e postar resolução) são as mais demoradas e, por isso, as de menor Tf. Isso é esperado, porque envolvem formulário, foto e envio.

### 6.3. Cálculo geral

**Eficácia.** Te = 85 / 120 = **0,71**. Nível ótimo.

**Eficiência.** Das 85 conclusões, 80 têm tempo registrado. tméd = 67,71 s, tmín = 1 s e tmáx = 344 s, o que dá Tf = 1 − 67,71 / (344 − 1) = **0,80**. Nível ótimo.

**Satisfação.** 15 das 16 sessões responderam a pergunta de satisfação. O participante `01KZE5T1…` enviou o questionário em branco. A média bruta é 4,53 em 5, e Ts = (4,53 − 1) / 4 = **0,88**. Nível ótimo.

**Nível de usabilidade.** Us = (0,71 + 0,80 + 0,88) / 3 = **0,80**. Nível ótimo.

Diferente da BVS, em que a satisfação foi a dimensão mais baixa (0,47), no Oikos ela é a mais alta, e a eficácia é a mais baixa das três.

### 6.4. Recorte por persona

| Persona | Participantes | Concluídas / realizadas | Te | Tf | Satisfação (1 a 5) | Us | Nível |
|---|---|---|---|---|---|---|---|
| Coletor(a) | 0 | sem dado | sem dado | sem dado | sem dado | sem dado | sem dado |
| Empresa de reciclagem | 1 | 8 / 8 | 1,00 | 0,87 | 5,00 | 0,96 | Ótimo |
| Empresa comum | 2 | 8 / 8 | 1,00 | 0,88 | 5,00 | 0,96 | Ótimo |
| Cidadão | 12 | 69 / 96 | 0,72 | 0,79 | 4,50 | 0,79 | Ótimo |
| Órgão público | 1 | 0 / 8 | 0,00 | sem dado | 4,00 | sem dado | sem dado |

Com exceção de Cidadão, os grupos têm um ou dois participantes, e o recorte por persona serve só como descrição, sem base para comparação. O Órgão público não tem Tf nem Us porque não concluiu nenhuma tarefa, e não há tempo de conclusão para medir.

## 7. Comportamento dos participantes

### 7.1. Sessão concluída não é o mesmo que tarefa concluída

"Sessão concluída" significa que o participante chegou ao fim do fluxo e enviou o questionário. Não significa que concluiu as tarefas. O app permite pular a tarefa atual ou avançar para o questionário a qualquer momento. As 35 tarefas não concluídas das sessões concluídas foram todas encerradas manualmente pelo participante, e nenhuma falhou por detecção. Isso faz parte do comportamento observado e não é defeito da coleta.

| Situação | Sessões | Participantes |
|---|---|---|
| Concluiu todas as tarefas disponíveis | 11 | 9 com 8/8 e 2 (Empresa comum, convertidos) com 4/4 |
| Concluiu parte das tarefas | 2 | `01M1G1FE…` (4/8) e `01M0D8DK…` (1/8) |
| Pulou todas as tarefas | 3 | `01M1FRS8…` (25 s), `01M20FVV…` (1,6 min) e `01M2TFRH…` (Órgão público, 16 s) |

Os três participantes que pularam todas as tarefas ainda atribuíram satisfação 5, 3 e 4. Isso reforça que a pergunta mede a percepção geral de uso do aplicativo, e não o desempenho nas tarefas. O caso do Órgão público (0 de 8 tarefas em 16 segundos) indica que o participante percorreu o fluxo da pesquisa sem executar as tarefas no app.

### 7.2. Resultado da suíte divergente das tarefas

Na produção, duas suítes foram gravadas pelo app como "NO" apesar de terem tarefas concluídas. São `01M1G1FE…`, com 4 de 8, e `01M2TFQW…`, com 7 de 8. Pela regra do protocolo, o esperado seria PARTIAL. É uma falha do cálculo do resultado da suíte no app mobile, registrada como issue. Depois das correções, o dashboard não usa mais esse campo para a eficácia, e a divergência não afeta os números.

### 7.3. Tarefas executadas fora da vez

O app só observa os sinais de sucesso da tarefa ativa. Como o objetivo da v11 diz que "não existe ordem certa", o participante pode realizar a ação de uma tarefa enquanto outra está ativa, e nesse caso a conclusão não é registrada. A telemetria de todas as tarefas não concluídas foi cruzada com as regras de sucesso, e dois casos têm o sinal registrado fora da vez:

1. `01M2TFQW…` (Empresa de reciclagem), T19. Às 14:49:21 o participante abriu uma denúncia pela lista (`complaint.opened`, `source: "list"`), mas a tarefa ativa era T17 (votar). Quando chegou a vez da T19, ele abriu a lista, não abriu nenhuma denúncia e avançou 50 segundos depois.
2. `01M0D8DK…` (Cidadão, convertido da v9), T12. O participante pulou as tarefas e, depois, abriu o mapa de denúncias (`GET /v1/complaints/map` e tela `/complaints`) enquanto a tarefa ativa era T18.

Por decisão metodológica, as duas tarefas foram **reclassificadas como concluídas**. O critério adotado é que a tarefa conta como concluída quando o sinal de sucesso aparece na sessão, mesmo fora da vez. A detecção continua registrada como manual (`auto_detected = false`), o que preserva a rastreabilidade. O resultado da suíte foi ajustado para YES (8/8) e PARTIAL (1/8), respectivamente. As duas mudanças existem só no banco de análise, e a produção mantém o registro original (Apêndice B).

Observação técnica relacionada: nas sessões em que T19 foi detectada, o evento que dispara a conclusão aparece gravado alguns milissegundos depois do fim da tarefa e marcado com a tarefa seguinte. A detecção funciona, mas a atribuição do evento à tarefa está deslocada, o que foi registrado como issue do app mobile.

### 7.4. Erros relatados

Dois participantes (`01M20FVV…` e `01M23Y5A…`) responderam que ocorreu erro na etapa, e a média da recuperação (H9) foi 2 em 5. O comentário de `01M23Y5A…` descreve o problema ("a imagem não está sendo enviada, resolvi reiniciando o app"), o que é compatível com o tempo alto e a eficiência baixa de T16.

## 8. Demais telas do painel (valores com o recorte corrigido)

- **Heurísticas (n = 15 respostas por item, escala 1 a 5).** H1 4,67; H2 4,33; H3 4,20; H4 4,53; H6 4,33; H8 4,53. H5, prevenção de erros: 13 de 15 suítes sem erro (87%). H9, recuperação: 2,00 (n = 2). H7 e H10 não são medidas, com a justificativa do protocolo.
- **Itens de domínio.** "Ajudaria a conectar pessoas e empresas da reciclagem": 4,60. "Resolveria um problema real do meu dia a dia": 4,47 (n = 15).
- **Caracterização (16 participantes).** 12 têm de 25 a 34 anos; 10 com superior completo ou pós-graduação; 10 não atuam profissionalmente com resíduos; 13 declaram experiência avançada ou muito avançada com aplicativos.
- **Comentários livres.** 10 comentários de sessões concluídas.

## 9. Limitações

1. **Amostra pequena e concentrada.** São 16 participantes, 12 deles Cidadãos, e nenhum Coletor(a). A amostra é auto-selecionada entre usuários do app. O recorte por persona é apenas descritivo.
2. **Conversão v9 para v11.** Oito sessões foram adaptadas por regra (seção 1.1). Na v9, T8 era detectada pela mudança de raio a partir de 2 km. Na v11 o raio inicial é 10 km, e a tarefa aceita filtro ou busca. Os questionários convertidos usam médias arredondadas de duas suítes.
3. **Reclassificações.** Duas tarefas foram reclassificadas pelo critério da seção 7.3. Sem elas, Te seria 83 / 120 = 0,69, e o Us continuaria na faixa ótima.
4. **Forma do Tf.** A fórmula literal de Lima et al. não subtrai tmín, o que desloca levemente o valor. Com tmín = 1 s, o efeito é desprezível neste recorte.
5. **Satisfação por suíte.** Com uma resposta por participante, a Ts tem menos granularidade que a do artigo (10 respostas por participante).

## Referência

LIMA, I. F.; OLIVEIRA, H. P. C.; SANTANA, S. R. Metodologia para avaliação do nível de usabilidade de bibliotecas digitais: um estudo na Biblioteca Virtual de Saúde. *TransInformação*, Campinas, v. 25, n. 2, p. 135-143, 2013.

## Apêndice A. Consultas que reproduzem os números

Executadas no banco local (`docker exec -i survey-mysql mysql -uuser -ppassword survey < consulta.sql`).

```sql
-- Geral: TAR, TARc, Te, tempos, Tf, satisfação e Ts
WITH t AS (
  SELECT s.id sid, s.persona, td.code, tr.outcome, tr.active_ms
  FROM usability_task_runs tr
  JOIN usability_task_defs td ON td.id = tr.task_id
  JOIN usability_suite_runs sr ON sr.id = tr.suite_run_id
  JOIN usability_sessions s ON s.id = sr.session_id
  WHERE s.status = 'COMPLETED' AND tr.finished_at IS NOT NULL AND tr.outcome IS NOT NULL
),
y AS (SELECT * FROM t WHERE outcome = 'YES' AND active_ms > 0),
b AS (SELECT MIN(active_ms) tmin, MAX(active_ms) tmax, AVG(active_ms) tmed, COUNT(*) n FROM y),
sat AS (
  SELECT a.session_id sid, AVG(a.value_number) v
  FROM usability_answers a
  JOIN usability_questions q ON q.id = a.question_id
  JOIN usability_sessions s ON s.id = a.session_id
  WHERE q.key = 'satisfaction' AND s.status = 'COMPLETED' AND a.value_number IS NOT NULL
  GROUP BY a.session_id
)
SELECT
  (SELECT COUNT(*) FROM t) TAR,
  (SELECT SUM(outcome = 'YES') FROM t) TARc,
  ROUND((SELECT SUM(outcome = 'YES') / COUNT(*) FROM t), 4) Te,
  (SELECT n FROM b) n_tempos,
  ROUND((SELECT tmed FROM b) / 1000, 2) tmed_s,
  (SELECT tmin FROM b) / 1000 tmin_s,
  (SELECT tmax FROM b) / 1000 tmax_s,
  ROUND((SELECT 1 - tmed / (tmax - tmin) FROM b), 4) Tf,
  (SELECT COUNT(*) FROM sat) n_sat,
  ROUND((SELECT AVG(v) FROM sat), 4) sat_media,
  ROUND((SELECT (AVG(v) - 1) / 4 FROM sat), 4) Ts;

-- Por tarefa (formato da Tabela 1)
WITH t AS (
  SELECT s.id sid, td.code, tr.outcome, tr.active_ms
  FROM usability_task_runs tr
  JOIN usability_task_defs td ON td.id = tr.task_id
  JOIN usability_suite_runs sr ON sr.id = tr.suite_run_id
  JOIN usability_sessions s ON s.id = sr.session_id
  WHERE s.status = 'COMPLETED' AND tr.finished_at IS NOT NULL AND tr.outcome IS NOT NULL
),
b AS (SELECT MIN(active_ms) tmin, MAX(active_ms) tmax FROM t WHERE outcome = 'YES' AND active_ms > 0)
SELECT code, COUNT(*) realizaram, SUM(outcome = 'YES') concluiram,
  ROUND(SUM(outcome = 'YES') / COUNT(*), 4) te,
  ROUND(AVG(CASE WHEN outcome = 'YES' AND active_ms > 0 THEN active_ms END) / 60000, 2) tmed_min,
  ROUND(1 - AVG(CASE WHEN outcome = 'YES' AND active_ms > 0 THEN active_ms END)
    / ((SELECT tmax FROM b) - (SELECT tmin FROM b)), 4) tf
FROM t GROUP BY code
ORDER BY FIELD(code, 'T8', 'T11', 'T12', 'T13', 'T16', 'T17', 'T18', 'T19');

-- Por persona
WITH t AS (
  SELECT s.id sid, s.persona, tr.outcome, tr.active_ms
  FROM usability_task_runs tr
  JOIN usability_suite_runs sr ON sr.id = tr.suite_run_id
  JOIN usability_sessions s ON s.id = sr.session_id
  WHERE s.status = 'COMPLETED' AND tr.finished_at IS NOT NULL AND tr.outcome IS NOT NULL
),
b AS (SELECT MIN(active_ms) tmin, MAX(active_ms) tmax FROM t WHERE outcome = 'YES' AND active_ms > 0),
sat AS (
  SELECT s.persona, a.session_id sid, AVG(a.value_number) v
  FROM usability_answers a
  JOIN usability_questions q ON q.id = a.question_id
  JOIN usability_sessions s ON s.id = a.session_id
  WHERE q.key = 'satisfaction' AND s.status = 'COMPLETED' AND a.value_number IS NOT NULL
  GROUP BY s.persona, a.session_id
)
SELECT t.persona, COUNT(DISTINCT t.sid) n, COUNT(*) tar, SUM(outcome = 'YES') tarc,
  ROUND(SUM(outcome = 'YES') / COUNT(*), 4) te,
  ROUND(1 - AVG(CASE WHEN outcome = 'YES' AND active_ms > 0 THEN active_ms END)
    / ((SELECT tmax FROM b) - (SELECT tmin FROM b)), 4) tf,
  (SELECT ROUND(AVG(v), 4) FROM sat WHERE sat.persona = t.persona) sat_media
FROM t GROUP BY t.persona;
```

## Apêndice B. Preparação do banco de análise

1. Recriar o banco local a partir do snapshot de produção (`snapshots/survey_prod_20260917_155217.sql`).
2. Copiar da produção, só leitura, as sessões, execuções, respostas e eventos dos participantes `01M2TFQW…` e `01M2TFRH…` (18/09/2026).
3. Rodar `bun run db:sync-v9-v11` em `packages/db`, que converte as 8 sessões da v9 e remove cópias `V9SYNC-` antigas. Um snapshot local anterior à conversão está em `snapshots/survey_local_pre_v11_convert_20260922_114324.sql`.
4. Aplicar as reclassificações da seção 7.3:

```sql
UPDATE usability_task_runs tr
JOIN usability_task_defs td ON td.id = tr.task_id AND td.code = 'T19'
JOIN usability_suite_runs sr ON sr.id = tr.suite_run_id
JOIN usability_sessions s ON s.id = sr.session_id
SET tr.outcome = 'YES'
WHERE s.participant_code = '01M2TFQW0VQP1STS1ZG8M6HMQC';

UPDATE usability_suite_runs sr
JOIN usability_sessions s ON s.id = sr.session_id
SET sr.outcome = 'YES'
WHERE s.participant_code = '01M2TFQW0VQP1STS1ZG8M6HMQC';

UPDATE usability_task_runs tr
JOIN usability_task_defs td ON td.id = tr.task_id AND td.code = 'T12'
JOIN usability_suite_runs sr ON sr.id = tr.suite_run_id
JOIN usability_sessions s ON s.id = sr.session_id
SET tr.outcome = 'YES'
WHERE s.participant_code = '01M0D8DK71AVW9T1087AT55Q7M';

UPDATE usability_suite_runs sr
JOIN usability_sessions s ON s.id = sr.session_id
SET sr.outcome = 'PARTIAL'
WHERE s.participant_code = '01M0D8DK71AVW9T1087AT55Q7M';
```
