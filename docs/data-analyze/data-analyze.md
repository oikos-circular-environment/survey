# Avaliação do nível de usabilidade do aplicativo Oikos

## 1. Introdução

Este relatório apresenta a avaliação de usabilidade do aplicativo Oikos, plataforma móvel voltada ao ecossistema da economia circular de resíduos sólidos. A avaliação adota a definição da ISO 9241-11, segundo a qual usabilidade é a medida na qual um produto pode ser usado por usuários específicos para alcançar objetivos específicos com eficácia, eficiência e satisfação em um contexto específico de uso (ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS, 2002).

A operacionalização dessas três dimensões segue a metodologia de Lima, Oliveira e Santana (2013), que a aplicaram na avaliação da Biblioteca Virtual em Saúde (BVS). A metodologia expressa eficácia, eficiência e satisfação como taxas adimensionais entre 0 e 1 e as combina em uma medida única de nível de usabilidade. O objetivo deste relatório é descrever o método empregado, orientar a interpretação dos indicadores e apresentar os resultados obtidos.

## 2. Método

### 2.1. Caracterização do teste

Trata-se de um teste de usabilidade autoaplicado, executado pelo participante dentro do próprio aplicativo, no aparelho dele, sem a presença de avaliador. O participante escolhe a persona com a qual mais se identifica e responde a um questionário de caracterização. Em seguida, executa as tarefas no aplicativo real e, ao final, responde um questionário de percepção.

A conclusão de cada tarefa não é anotada por um observador. O aplicativo a reconhece automaticamente por um sinal de sucesso associado à tarefa, que pode ser a chamada de um serviço, a abertura de uma tela ou um evento de interface. O participante pode pular uma tarefa a qualquer momento, e nesse caso ela é registrada como não concluída. O aplicativo também mede o tempo ativo de execução de cada tarefa, descontando os períodos em que a execução foi pausada.

### 2.2. Tarefas

O teste é composto por uma etapa com oito tarefas, que cobrem a consulta a pontos de coleta e o ciclo de participação em denúncias de descarte irregular. O participante é orientado a percorrer as tarefas na ordem que preferir.

| Código | Tarefa |
|---|---|
| T8 | Usar os filtros de Pontos de Coleta (raio de busca, categoria ou busca por texto) |
| T11 | Visualizar os detalhes de uma empresa |
| T12 | Visualizar o mapa de denúncias |
| T13 | Usar os filtros de Denúncias (status, categoria ou periculosidade) |
| T16 | Criar uma denúncia, com localização e foto ou vídeo |
| T17 | Votar em uma denúncia registrada por outra pessoa |
| T18 | Postar uma resolução para uma denúncia |
| T19 | Abrir uma denúncia própria na lista de denúncias |

Uma tarefa é considerada concluída quando o seu sinal de sucesso é registrado na sessão do participante, ainda que a ação tenha sido realizada fora da ordem apresentada.

### 2.3. Instrumento de percepção

Ao final da etapa, o participante responde um questionário de escala. A satisfação é medida pela pergunta "Como você avalia sua satisfação com esta etapa?", em escala de cinco pontos (1 Péssimo, 2 Ruim, 3 Regular, 4 Bom, 5 Ótimo). O texto de apoio orienta o participante a considerar a experiência de uso do aplicativo na etapa como um todo. Os demais itens medem a concordância com afirmações associadas às heurísticas de Nielsen (1994) e a dois itens de relevância para o domínio da reciclagem.

### 2.4. Critério de inclusão

Entram na análise apenas as sessões concluídas, isto é, aquelas em que o participante chegou ao fim do fluxo e enviou o questionário. Sessões iniciadas e não finalizadas são excluídas. Dentro das sessões concluídas, considera-se realizada toda tarefa que o participante iniciou e que teve resultado registrado, seja ele concluída ou não concluída.

### 2.5. Variáveis e cálculos

Seguindo Lima, Oliveira e Santana (2013), as três dimensões são tratadas como séries numéricas em níveis distintos de mensuração. A eficácia é nominal (concluída ou não concluída), a eficiência é intervalar (tempo) e a satisfação é ordinal (escala de satisfação).

**Eficácia.** É a razão entre o número de tarefas concluídas e o número de tarefas realizadas.

$$T_e = \frac{\sum TAR_c}{\sum TAR}$$

Em que $T_e$ é a taxa de eficácia, $TAR_c$ é a quantidade de tarefas concluídas e $TAR$ é a quantidade de tarefas realizadas. Quanto mais $T_e$ se aproxima de 1, mais eficaz é o aplicativo.

Por tarefa, a mesma razão corresponde ao número de participantes que concluíram a tarefa dividido pelo número de participantes que a iniciaram.

**Eficiência.** É obtida a partir do tempo médio de execução das tarefas concluídas, comparado com o menor e o maior tempo de conclusão observados no teste.

$$t_{méd} = \frac{\sum t}{\sum TAR_c} \qquad T_f = 1 - \frac{t_{méd}}{t_{máx} - t_{mín}}$$

Em que $T_f$ é a taxa de eficiência, $t_{méd}$ é o tempo médio das conclusões, $t_{mín}$ é o menor tempo gasto para concluir qualquer tarefa e $t_{máx}$ é o maior. A relação é inversa. Quanto mais o tempo médio se aproxima do menor tempo observado, mais $T_f$ se aproxima de 1 e mais eficiente é o aplicativo. Como $t_{mín}$ e $t_{máx}$ são os mesmos para todas as tarefas, a eficiência de uma tarefa pode ser comparada diretamente com a de outra.

Três decisões complementam a fórmula. Entram no tempo médio apenas as conclusões com tempo registrado. Conclusões com tempo igual a zero indicam falha de medição e são desconsideradas. Quando um grupo de participantes realizou tarefas sem concluir nenhuma, não há tempo de conclusão a medir, e a eficiência do grupo é zero.

**Satisfação.** A resposta de cada participante, de 1 a 5, é convertida para o intervalo de 0 a 1, de modo que 1 (Péssimo) corresponda a 0 e 5 (Ótimo) corresponda a 1. A taxa de satisfação é a média dessas taxas entre os participantes.

$$T_{su} = \frac{S_u - 1}{4} \qquad T_s = \frac{\sum T_{su}}{U}$$

Em que $T_{su}$ é a taxa de satisfação do participante, $S_u$ é a resposta dele e $U$ é o número de participantes que responderam. A conversão cumpre o mesmo papel da razão $S_u / S_{máx}$ de Lima, Oliveira e Santana (2013), que usaram escala de 0 a 3.

**Nível de usabilidade.** É a média aritmética das três taxas, sem pesos diferenciados, já que as três dimensões têm a mesma importância na definição de usabilidade.

$$U_s = \frac{T_e + T_f + T_s}{3}$$

### 2.6. Faixas de interpretação

O intervalo de 0 a 1 é dividido em quatro partes de igual amplitude, que valem tanto para o nível de usabilidade quanto para cada taxa isoladamente.

| Faixa | Intervalo |
|---|---|
| Péssimo | 0 ≤ valor < 0,25 |
| Satisfatório | 0,25 ≤ valor < 0,50 |
| Bom | 0,50 ≤ valor < 0,75 |
| Ótimo | 0,75 ≤ valor ≤ 1 |

### 2.7. Diferenças em relação ao estudo de referência

O cálculo segue a mesma lógica de Lima, Oliveira e Santana (2013), com diferenças que decorrem do formato do teste.

| Aspecto | Lima, Oliveira e Santana (2013) | Este estudo |
|---|---|---|
| Aplicação | Laboratório, com avaliador presente | Autoaplicada, no aparelho do participante |
| Conclusão da tarefa | Registrada pelo avaliador | Reconhecida pelo aplicativo por sinal de sucesso |
| Tempo | Cronometrado por tarefa | Tempo ativo medido pelo aplicativo, sem pausas |
| Satisfação | Uma resposta por tarefa, escala de 0 a 3 | Uma resposta ao final da etapa, escala de 1 a 5 |
| Tarefas | 10 | 8 |

A diferença mais relevante está na satisfação. No estudo de referência ela é medida após cada tarefa. Aqui ela é medida uma única vez, ao fim da etapa, e expressa a percepção sobre o uso do aplicativo como um todo. Por isso a satisfação não aparece na tabela de resultados por tarefa.

## 3. Resultados

### 3.1. Participantes

A pesquisa ficou disponível de 1 de agosto a 1 de outubro de 2026. Nesse período foram analisadas 14 sessões concluídas. Doze participantes se identificaram como Cidadão, um como Empresa de reciclagem e um como Órgão público. Nenhum participante escolheu as personas Coletor(a) e Empresa comum. Outras cinco sessões foram iniciadas e não finalizadas, e ficaram fora da análise.

| Característica | Distribuição |
|---|---|
| Faixa etária | 10 de 25 a 34 anos; 1 com menos de 18; 1 de 18 a 24; 1 de 35 a 44; 1 com mais de 64 |
| Escolaridade | 2 fundamental completo; 4 superior incompleto; 6 superior completo; 2 pós-graduação |
| Atuação com resíduos | 9 não atuam profissionalmente; 1 pesquisa o tema; 1 cooperativa; 1 empresa de reciclagem; 1 empresa de outro setor; 1 setor público |
| Contato com reciclagem | 2 nunca; 6 raramente; 4 ocasionalmente; 2 diariamente |
| Experiência com aplicativos | 1 básica; 1 moderada; 4 avançada; 8 muito avançada |

A amostra é jovem, escolarizada e familiarizada com aplicativos. Doze dos 14 participantes declaram experiência avançada ou muito avançada.

### 3.2. Resultados por tarefa

Os resultados por tarefa são expostos na Tabela 1. As colunas seguem uma sequência de afunilamento, do total de participantes até o desempenho de quem concluiu a tarefa.

| Coluna | O que representa |
|---|---|
| Código e Título | Identificação da tarefa |
| Suíte | Etapa do teste à qual a tarefa pertence |
| Total concluintes | Participantes que concluíram a etapa |
| Iniciaram | Dos concluintes, quantos iniciaram a tarefa ($\sum TAR$ da tarefa) |
| Concluíram | Dos que iniciaram, quantos tiveram o sinal de sucesso registrado ($\sum TAR_c$ da tarefa) |
| Eficácia | Concluíram dividido por iniciaram ($T_e$ da tarefa) |
| Eficiência | Posição do tempo médio da tarefa entre a conclusão mais rápida e a mais lenta do teste ($T_f$ da tarefa) |
| Tempo médio | Média do tempo ativo das conclusões, em minutos e segundos ($t_{méd}$ da tarefa) |

A eficiência vem antes do tempo médio porque é calculada a partir dele, e o tempo médio fica ao lado como valor de apoio para a leitura.

**Tabela 1.** Resultados por tarefa.

| Código | Título | Suíte | Total concluintes | Iniciaram | Concluíram | Eficácia | Eficiência | Tempo médio |
|---|---|---|---|---|---|---|---|---|
| T8 | Usar os filtros de Pontos de Coleta | S1 | 14 | 14 | 10 | 71% | 0,84 | 0:55 |
| T11 | Visualizar os detalhes de uma empresa | S1 | 14 | 14 | 10 | 71% | 0,93 | 0:23 |
| T12 | Visualizar o mapa de denúncias | S1 | 14 | 14 | 11 | 79% | 0,92 | 0:26 |
| T13 | Usar os filtros de Denúncias | S1 | 14 | 14 | 9 | 64% | 0,87 | 0:44 |
| T16 | Criar uma denúncia | S1 | 14 | 14 | 9 | 64% | 0,48 | 2:58 |
| T17 | Votar em uma denúncia | S1 | 14 | 14 | 10 | 71% | 0,90 | 0:34 |
| T18 | Postar uma resolução | S1 | 14 | 14 | 9 | 64% | 0,60 | 2:18 |
| T19 | Abrir uma denúncia sua na lista | S1 | 14 | 14 | 9 | 64% | 0,78 | 1:15 |
| | **Total** | | **14** | **112** | **77** | **69%** | **0,80** | **1:09** |

O tempo médio total é calculado sobre as 76 conclusões com tempo registrado, e não sobre a média das linhas.

A leitura da tabela deve ser feita da esquerda para a direita. Na tarefa T11, por exemplo, os 14 participantes iniciaram a tarefa e 10 a concluíram, o que resulta em eficácia de 10 / 14 = 0,71. Os participantes que concluíram levaram em média 23 segundos. Esse tempo está muito mais próximo da conclusão mais rápida do teste (1 segundo) do que da mais lenta (5 minutos e 44 segundos), e por isso a eficiência é alta, 1 − 23,4 / (344 − 1) = 0,93.

### 3.3. Eficácia

Os participantes concluíram 77 das 112 tarefas realizadas.

$$T_e = \frac{77}{112} = 0{,}69$$

A eficácia do aplicativo situa-se na faixa **boa**. A tarefa com maior eficácia foi a visualização do mapa de denúncias (T12, 79%). As menores ficaram com o uso dos filtros de Denúncias (T13), a criação de denúncia (T16), a postagem de resolução (T18) e a abertura de denúncia própria na lista (T19), com 64% cada, tarefas que exigem mais passos ou dependem de outra ação anterior.

### 3.4. Eficiência

O menor tempo de conclusão observado foi de 1 segundo e o maior foi de 344 segundos (5 min 44 s). O tempo médio das 76 conclusões com tempo registrado foi de 69,1 segundos (1 min 09 s).

$$T_f = 1 - \frac{69{,}1}{344 - 1} = 0{,}80$$

A eficiência do aplicativo situa-se na faixa **ótima**. Aplicando a mesma divisão em quatro intervalos iguais ao tempo médio, como fazem Lima, Oliveira e Santana (2013) no Gráfico 2, a eficiência seria ótima com tempo médio até cerca de 1 min 27 s, boa até 2 min 53 s, satisfatória até 4 min 18 s e péssima acima disso. O tempo médio observado, de 1 min 09 s, fica na faixa ótima.

Por tarefa, a eficiência reflete a natureza da ação solicitada. As tarefas de consulta (T8, T11, T12, T13 e T17) têm tempo médio abaixo de um minuto e eficiência entre 0,84 e 0,93. As tarefas que envolvem preenchimento e envio de conteúdo são mais demoradas: criar uma denúncia, com local, foto e descrição (T16, 2:58, eficiência 0,48), e postar uma resolução (T18, 2:18, eficiência 0,60).

### 3.5. Satisfação

Os 14 participantes responderam à pergunta de satisfação. Oito atribuíram nota 5 (Ótimo), cinco atribuíram nota 4 (Bom) e um atribuiu nota 3 (Regular). A média das respostas foi 4,50.

$$T_s = \frac{4{,}50 - 1}{4} = 0{,}88$$

A satisfação situa-se na faixa **ótima** e é a dimensão mais alta das três.

### 3.6. Nível de usabilidade

$$U_s = \frac{0{,}69 + 0{,}80 + 0{,}88}{3} = 0{,}79$$

O aplicativo Oikos apresenta **nível ótimo de usabilidade**.

| Dimensão | Taxa | Faixa |
|---|---|---|
| Eficácia | 0,69 | Bom |
| Eficiência | 0,80 | Ótimo |
| Satisfação | 0,88 | Ótimo |
| **Nível de usabilidade** | **0,79** | **Ótimo** |

### 3.7. Resultados por persona

**Tabela 2.** Resultados por persona.

| Persona | Participantes | Concluídas / realizadas | Eficácia | Eficiência | Satisfação (1 a 5) | Nível de usabilidade | Faixa |
|---|---|---|---|---|---|---|---|
| Coletor(a) | 0 | sem dado | sem dado | sem dado | sem dado | sem dado | sem dado |
| Empresa de reciclagem | 1 | 8 / 8 | 1,00 | 0,87 | 5,00 | 0,96 | Ótimo |
| Empresa comum | 0 | sem dado | sem dado | sem dado | sem dado | sem dado | sem dado |
| Cidadão | 12 | 69 / 96 | 0,72 | 0,79 | 4,50 | 0,79 | Ótimo |
| Órgão público | 1 | 0 / 8 | 0,00 | 0,00 | 4,00 | 0,25 | Satisfatório |

As cinco personas do instrumento aparecem na tabela, inclusive as que não tiveram participantes no período. Apenas a persona Cidadão tem número de participantes suficiente para uma leitura própria, e seus resultados acompanham os do conjunto. Empresa de reciclagem e Órgão público têm um participante cada, e os valores descrevem esses casos individuais, sem permitir comparação entre grupos. O participante da persona Órgão público não concluiu nenhuma tarefa, o que leva eficácia e eficiência a zero. O nível de usabilidade de 0,25 decorre apenas da satisfação declarada.

### 3.8. Indicadores complementares do questionário

As médias dos itens associados às heurísticas de Nielsen (1994), em escala de 1 a 5, com 14 respostas por item, foram as seguintes:

| Heurística | Item | Média |
|---|---|---|
| H1 Visibilidade do status do sistema | O aplicativo deixou claro o que estava acontecendo | 4,64 |
| H2 Correspondência com o mundo real | Os termos e as categorias fizeram sentido | 4,36 |
| H3 Controle e liberdade do usuário | Sempre soube onde estava e como seguir | 4,29 |
| H4 Consistência e padrões | As telas seguiram um padrão parecido | 4,64 |
| H6 Reconhecimento em vez de memorização | Não precisei guardar informações entre telas | 4,43 |
| H8 Design estético e minimalista | As telas mostraram o necessário | 4,50 |

Doze dos 14 participantes relataram não ter encontrado erro durante a etapa (86%). Os dois que relataram erro avaliaram a mensagem de recuperação com média 2,0 (H9). Os itens de relevância para o domínio também tiveram médias altas: 4,57 para "ajudaria a conectar pessoas e empresas da reciclagem" e 4,43 para "resolveria um problema real do meu dia a dia".

## 4. Interpretação dos resultados

**Concluir a sessão não equivale a concluir as tarefas.** Uma sessão concluída indica que o participante chegou ao fim do fluxo e enviou o questionário. Como o participante pode pular qualquer tarefa, a eficácia registra o que ele efetivamente conseguiu fazer no aplicativo. Das 14 sessões concluídas, 9 concluíram todas as 8 tarefas e 2 concluíram parte delas. Outras 3 pularam todas as tarefas, uma delas em apenas 16 segundos. As 35 tarefas não concluídas foram todas encerradas pelo próprio participante, e nenhuma decorreu de falha na detecção.

**A satisfação mede a percepção geral, e não o desempenho.** Os três participantes que não concluíram nenhuma tarefa atribuíram notas 5, 4 e 3 à satisfação. Isso confirma que a pergunta capta a impressão sobre o aplicativo, independente do resultado nas tarefas, e justifica tratá-la como dimensão própria no cálculo.

**O perfil das dimensões difere do estudo de referência.** Na BVS, a satisfação foi a dimensão mais baixa (0,47) e a eficácia a mais alta (0,79). No Oikos ocorre o inverso. A satisfação é a mais alta (0,88) e a eficácia é a mais baixa (0,69). A eficácia é reduzida sobretudo pelas sessões em que o participante pulou todas as tarefas. Considerando apenas os 11 participantes que concluíram ao menos uma tarefa, a eficácia seria de 77 / 88 = 0,88.

**As tarefas de produção de conteúdo concentram a menor eficiência.** Criar uma denúncia e postar uma resolução exigem preencher formulário, anexar mídia e enviar. São também as tarefas com a menor eficácia. Um dos participantes que relataram erro descreveu falha no envio de imagem, resolvida ao reiniciar o aplicativo, o que é compatível com o tempo mais alto dessas tarefas.

## 5. Limitações

1. **Tamanho e composição da amostra.** São 14 participantes, 12 deles da persona Cidadão, e nenhum das personas Coletor(a) e Empresa comum. A amostra é auto-selecionada entre usuários do aplicativo e concentra pessoas jovens, escolarizadas e experientes com aplicativos, o que tende a favorecer os resultados.
2. **Resultados por persona.** Com exceção de Cidadão, os grupos têm um participante, e os valores por persona são apenas descritivos.
3. **Satisfação por etapa.** Com uma resposta por participante, a taxa de satisfação tem menos granularidade que a do estudo de referência, que coletou uma resposta por tarefa.
4. **Forma da taxa de eficiência.** A fórmula de Lima, Oliveira e Santana (2013) não subtrai o menor tempo do tempo médio. Com menor tempo de 1 segundo, o efeito é desprezível neste teste.
5. **Registro de tempo.** Uma das 77 conclusões não teve tempo registrado e ficou fora do cálculo da eficiência.

## Referências

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 9241-11**: requisitos ergonômicos para trabalho de escritório com computador. Parte 11: orientações sobre usabilidade. Rio de Janeiro: ABNT, 2002.

LIMA, I. F.; OLIVEIRA, H. P. C.; SANTANA, S. R. Metodologia para avaliação do nível de usabilidade de bibliotecas digitais: um estudo na Biblioteca Virtual de Saúde. **TransInformação**, Campinas, v. 25, n. 2, p. 135-143, 2013.

NIELSEN, J. **10 Usability Heuristics for User Interface Design**. Nielsen Norman Group, 1994. Disponível em: https://www.nngroup.com/articles/ten-usability-heuristics/.
