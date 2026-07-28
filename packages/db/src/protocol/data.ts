/**
 * Protocolo do Modo Pesquisa de Usabilidade — FONTE DA VERDADE.
 *
 * Define o experimento inteiro: personas, suítes, tarefas e perguntas. É versionado no
 * git, revisado em pull request e materializado nas tabelas `usability_*` pelo seed
 * (`../seed/seed.ts`). O endpoint público serve o protocolo lendo dessas tabelas, e o
 * aplicativo renderiza tudo a partir dele — nenhuma pergunta é embutida no código do
 * aplicativo.
 *
 * Regras:
 *  - Publicar uma versão nova NUNCA altera o que participantes anteriores viram.
 *    Cada sessão aponta para a versão que executou; versões antigas ficam congeladas.
 *  - Alterar qualquer conteúdo aqui exige incrementar `version`.
 *  - Integridade referencial (toda tarefa referenciada existe, nenhum código repetido)
 *    e os `path_pattern` de detecção são verificados pelo validador de forma
 *    (`./validate.ts`), que quebra a integração contínua antes do seed rodar.
 *
 * Referência do instrumento: mestrado/plans/oikos-walkthrough.md (§4, §6.6, §7) e os
 * cinco formulários aplicados no Google Forms. A leitura humana do conjunto de perguntas
 * está em plans/survey-usability-in-app/05-questionario.md.
 *
 * ── Versão 2 ────────────────────────────────────────────────────────────────
 *
 * As cinco perguntas abertas de fim de etapa viraram itens de escala. O formato dentro
 * do aplicativo é autoaplicado, e campo de texto obrigatório sem ninguém ao lado produz
 * abandono ou resposta de duas palavras dada só para passar da tela.
 *
 * O SUS saiu do encerramento. Perde-se a comparação com a média da indústria; ganha-se
 * densidade, porque as dimensões passam a ser medidas a cada etapa em vez de uma vez só
 * no fim.
 *
 * A cobertura das heurísticas de Nielsen subiu de quatro perguntas para sete. As três
 * restantes têm destino explícito: H5 e H7 são medidas objetivamente — taxa de erro e
 * tempo ativo por tarefa —, e H10 está fora de escopo porque o aplicativo não oferece
 * ajuda ao participante nesta versão. A justificativa anterior, de que o avaliador
 * registraria essas dimensões nas observações qualitativas, não vale mais: não há
 * avaliador.
 */

import type { Option, Persona, Protocol, Question, Suite, Task } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// Tarefas
// ═══════════════════════════════════════════════════════════════════════════

const tasks: Task[] = [
	{
		code: "T1",
		title: "Criar uma conta",
		instruction:
			"Crie uma conta no Oikos utilizando seu e-mail e uma senha de sua escolha.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/users/register",
					status: 204,
				},
			],
		},
	},
	{
		code: "T2",
		title: "Fazer login",
		instruction:
			"Entre no aplicativo com o e-mail e a senha que você acabou de cadastrar.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/auth/login",
					status: 200,
				},
			],
		},
	},
	{
		code: "T3",
		title: "Preencher o perfil completo",
		instruction:
			"Acesse a área de perfil e preencha seus dados: nome completo, telefone, endereço (CEP, rua, número, bairro, cidade e estado) e adicione uma foto de perfil.",
		// Duas ações distintas: salvar os dados e enviar a foto.
		success: {
			mode: "all",
			signals: [
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/profiles",
					status: 200,
				},
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/profiles/avatar",
					status: 200,
				},
			],
		},
	},
	{
		code: "T4",
		title: "Cadastrar uma empresa ou ponto de coleta",
		instruction:
			"Cadastre sua empresa ou ponto de coleta informando nome fantasia, razão social, tipo, número de identificação (CPF ou CNPJ) e telefone de contato.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/companies",
					status: 201,
				},
			],
		},
	},
	{
		code: "T5",
		title: "Informar o endereço da empresa",
		instruction:
			"Na empresa que você cadastrou, preencha o endereço completo: CEP, rua, número, bairro, cidade e estado.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/companies/:id/addresses",
					status: 200,
				},
			],
		},
	},
	{
		code: "T6",
		title: "Configurar os horários de funcionamento",
		instruction:
			"Configure os horários de funcionamento da empresa, indicando os dias da semana em que ela opera e os horários de abertura e fechamento.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/companies/:id/business-hours",
					status: 200,
				},
			],
		},
	},
	{
		code: "T7",
		title: "Adicionar resíduos e serviços",
		instruction:
			"Adicione pelo menos um resíduo que você aceita para coleta (por exemplo papelão ou plástico), informando o preço por unidade de medida. Depois, adicione pelo menos um serviço oferecido, como coleta sob demanda.",
		// A tarefa só está completa com as duas coisas cadastradas.
		success: {
			mode: "all",
			signals: [
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/companies/:id/wastes",
					status: 200,
				},
				{
					kind: "api",
					method: "PUT",
					path_pattern: "/v1/companies/:id/services",
					status: 200,
				},
			],
		},
	},
	{
		code: "T8",
		title: "Buscar pontos de coleta próximos",
		instruction:
			"Acesse a seção de pontos de coleta e busque empresas ou coletores próximos à sua localização atual.",
		success: {
			mode: "any",
			signals: [
				{ kind: "api", method: "GET", path_pattern: "/v1/market", status: 200 },
			],
		},
	},
	{
		code: "T9",
		title: "Filtrar por tipo de resíduo",
		instruction:
			"Na lista de pontos de coleta, use o filtro para encontrar empresas que aceitem um tipo específico de resíduo.",
		// Mesmo endpoint da T8 — só o parâmetro de filtro as distingue.
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/market",
					status: 200,
					query: { category: true },
				},
			],
		},
	},
	{
		code: "T10",
		title: "Visualizar os detalhes de uma empresa",
		instruction:
			"Selecione uma empresa da lista e veja todos os seus dados: endereço, horários, resíduos aceitos, serviços oferecidos e contato.",
		// Tarefa de leitura: os dados já vieram na busca, então nenhuma requisição nova
		// acontece. A chegada à tela é o único sinal disponível.
		success: {
			mode: "any",
			signals: [{ kind: "screen", route: "/market/[companyId]" }],
		},
	},
	{
		code: "T11",
		title: "Visualizar o mapa de denúncias",
		instruction:
			"Acesse a seção de denúncias e veja no mapa as denúncias de descarte irregular existentes na sua região.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
				},
			],
		},
	},
	{
		code: "T12",
		title: "Filtrar denúncias por status",
		instruction:
			"No mapa de denúncias, use o filtro para exibir apenas as denúncias abertas. Depois, alterne para exibir apenas as resolvidas.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
					query: { status: true },
				},
			],
		},
	},
	{
		code: "T13",
		title: "Filtrar denúncias por categoria de resíduo",
		instruction:
			"No mapa de denúncias, use o filtro para exibir apenas denúncias relacionadas a um tipo específico de resíduo.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
					query: { waste_category_id: true },
				},
			],
		},
	},
	{
		code: "T14",
		title: "Filtrar denúncias por nível de periculosidade",
		instruction:
			"No mapa de denúncias, use o filtro de nível de perigo para exibir apenas denúncias de alta ou muito alta periculosidade.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
					query: { hazard_level: true },
				},
			],
		},
	},
	{
		code: "T15",
		title: "Criar uma denúncia",
		instruction:
			"Registre uma denúncia de descarte irregular: informe o local, adicione uma foto ou vídeo, escreva suas observações e selecione as categorias de resíduo que você identificou.",
		// A denúncia sem mídia não cumpre o enunciado, então ambos os sinais são exigidos.
		success: {
			mode: "all",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints",
					status: 201,
				},
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints/:id/attachments",
					status: 201,
				},
			],
		},
	},
	{
		code: "T16",
		title: "Votar em uma denúncia",
		instruction:
			"Escolha uma denúncia existente e vote indicando se o problema já foi resolvido ou não.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints/:id/votes",
					status: 201,
				},
			],
		},
	},
	{
		code: "T17",
		title: "Postar uma resolução",
		instruction:
			"Escolha uma denúncia e poste uma resolução descrevendo a ação tomada para resolver o problema. Se você cadastrou uma empresa, vincule a resolução a ela.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints/:id/resolutions",
					status: 201,
				},
			],
		},
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Suítes
// ═══════════════════════════════════════════════════════════════════════════

const suites: Suite[] = [
	{
		code: "S1",
		title: "Exploração livre",
		objective:
			"Antes de criar uma conta, explore o aplicativo livremente. Pesquise pontos de coleta e veja o que é possível visualizar nas denúncias sem estar logado.",
		task_codes: ["T8", "T9", "T10", "T11", "T12", "T13", "T14"],
	},
	{
		code: "S2",
		title: "Registro e perfil",
		objective:
			"Agora que você explorou o aplicativo, crie sua conta, entre nela e preencha seu perfil com seus dados e uma foto.",
		task_codes: ["T1", "T2", "T3"],
	},
	{
		code: "S3",
		title: "Exposição ao ecossistema",
		objective:
			"Imagine que você quer que pessoas e empresas da região encontrem o seu negócio ou ponto de coleta. Cadastre sua empresa com todas as informações e depois tente encontrá-la nos pontos de coleta.",
		task_codes: ["T4", "T5", "T6", "T7", "T8"],
	},
	{
		code: "S4",
		title: "Busca de parceiros comerciais",
		objective:
			"Imagine que você quer encontrar parceiros para o seu negócio: quem compre os resíduos que você coleta, quem forneça material reciclável, ou coletores cujo serviço você possa contratar.",
		task_codes: ["T8", "T9", "T10"],
	},
	{
		code: "S5",
		title: "Fiscalização e atuação pública",
		objective:
			"Imagine que você representa um órgão público. Cadastre o órgão para expor os serviços que oferece à população. Depois, use os filtros de denúncia para definir prioridades de atendimento e registre uma resolução.",
		task_codes: ["T4", "T5", "T6", "T7", "T11", "T12", "T13", "T14", "T17"],
	},
	{
		code: "S6",
		title: "Participação cidadã",
		objective:
			"Imagine que você é morador da cidade e quer participar da gestão de resíduos: encontre onde descartar, registre uma denúncia de descarte irregular, explore as denúncias existentes, vote em uma delas e poste uma resolução.",
		task_codes: [
			"T8",
			"T9",
			"T10",
			"T15",
			"T11",
			"T12",
			"T13",
			"T14",
			"T16",
			"T17",
		],
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Personas — só definem o roteiro. Nenhuma pergunta é específica de persona.
// ═══════════════════════════════════════════════════════════════════════════

const personas: Persona[] = [
	{
		key: "COLLECTOR",
		label: "Coletor(a)",
		description:
			"Você coleta materiais recicláveis, por conta própria ou em cooperativa.",
		suite_codes: ["S1", "S2", "S3", "S4"],
	},
	{
		key: "RECYCLING_COMPANY",
		label: "Empresa de reciclagem",
		description:
			"Sua empresa coleta, tria, processa ou revende materiais recicláveis.",
		suite_codes: ["S1", "S2", "S3", "S4"],
	},
	{
		key: "GENERAL_COMPANY",
		label: "Empresa comum",
		description:
			"Sua empresa gera resíduos mas não trabalha com reciclagem — comércio, restaurante, escritório, prestadora de serviço.",
		suite_codes: ["S1", "S2", "S4"],
	},
	{
		key: "CITIZEN",
		label: "Cidadão",
		description:
			"Você mora na cidade, gera resíduo doméstico e quer saber onde descartar corretamente.",
		suite_codes: ["S1", "S2", "S6"],
	},
	{
		key: "GOVERNMENT",
		label: "Órgão público",
		description:
			"Você trabalha em uma instituição pública ligada a regulamentação, fiscalização ou gestão ambiental.",
		suite_codes: ["S1", "S2", "S5"],
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Perguntas de caracterização (SCREENER)
//
// Respondidas uma vez, antes de começar. Diferente das demais, estas respostas são
// gravadas em colunas próprias da sessão, e não na tabela de respostas: desde que
// caracterizar quem se encaixa como usuário virou pergunta de pesquisa, elas passaram
// a ser dimensão primária de análise.
// ═══════════════════════════════════════════════════════════════════════════

const ageRangeOptions: Option[] = [
	{ value: 1, key: "UNDER_18", label: "Menos de 18 anos" },
	{ value: 2, key: "AGE_18_24", label: "18 a 24 anos" },
	{ value: 3, key: "AGE_25_34", label: "25 a 34 anos" },
	{ value: 4, key: "AGE_35_44", label: "35 a 44 anos" },
	{ value: 5, key: "AGE_45_54", label: "45 a 54 anos" },
	{ value: 6, key: "AGE_55_64", label: "55 a 64 anos" },
	{ value: 7, key: "OVER_64", label: "Mais de 64 anos" },
];

const educationLevelOptions: Option[] = [
	{ value: 1, key: "NONE", label: "Não estudei" },
	{ value: 2, key: "ELEMENTARY_INCOMPLETE", label: "Fundamental incompleto" },
	{ value: 3, key: "ELEMENTARY_COMPLETE", label: "Fundamental completo" },
	{ value: 4, key: "HIGHSCHOOL_INCOMPLETE", label: "Médio incompleto" },
	{ value: 5, key: "HIGHSCHOOL_COMPLETE", label: "Médio completo" },
	{ value: 6, key: "HIGHER_INCOMPLETE", label: "Superior incompleto" },
	{ value: 7, key: "HIGHER_COMPLETE", label: "Superior completo" },
	{ value: 8, key: "POSTGRADUATE", label: "Pós-graduação" },
];

const chainRoleOptions: Option[] = [
	{
		value: 1,
		key: "INDEPENDENT_COLLECTOR",
		label: "Coleto material reciclável por conta própria",
	},
	{
		value: 2,
		key: "COOPERATIVE_MEMBER",
		label: "Faço parte de uma cooperativa ou associação",
	},
	{
		value: 3,
		key: "RECYCLING_BUSINESS",
		label: "Trabalho em empresa de reciclagem",
	},
	{
		value: 4,
		key: "GENERAL_BUSINESS",
		label: "Trabalho em empresa de outro setor",
	},
	{ value: 5, key: "PUBLIC_SERVANT", label: "Trabalho no setor público" },
	{ value: 6, key: "RESEARCHER", label: "Pesquiso ou estudo o tema" },
	{ value: 7, key: "NONE", label: "Não atuo profissionalmente com resíduos" },
];

const wasteContactFrequencyOptions: Option[] = [
	{
		value: 1,
		key: "NEVER",
		label: "Nunca — não lida com reciclagem ou resíduos em nenhum contexto",
	},
	{
		value: 2,
		key: "RARELY",
		label:
			"Raramente — contato esporádico, sem regularidade, como separar lixo de vez em quando",
	},
	{
		value: 3,
		key: "OCCASIONALLY",
		label:
			"Ocasionalmente — contato periódico, mas não é parte central da rotina, como descartar reciclável semanalmente",
	},
	{
		value: 4,
		key: "FREQUENTLY",
		label:
			"Frequentemente — contato regular e recorrente, pessoal ou profissional, várias vezes por semana",
	},
	{
		value: 5,
		key: "DAILY",
		label:
			"Diariamente — o tema faz parte da rotina diária, pessoal ou profissionalmente",
	},
];

const appExperienceOptions: Option[] = [
	{
		value: 1,
		key: "NONE",
		label: "Nenhuma — não uso ou raramente uso celular e aplicativos",
	},
	{
		value: 2,
		key: "BASIC",
		label:
			"Básica — uso funções simples como ligações e mensagens, com pouca familiaridade com aplicativos",
	},
	{
		value: 3,
		key: "MODERATE",
		label:
			"Moderada — uso aplicativos do dia a dia como redes sociais, mensagens e mapas com certa autonomia",
	},
	{
		value: 4,
		key: "ADVANCED",
		label:
			"Avançada — uso vários aplicativos com frequência, incluindo cadastros, formulários e pagamentos",
	},
	{
		value: 5,
		key: "VERY_ADVANCED",
		label:
			"Muito avançada — uso aplicativos diariamente e sem dificuldade, inclusive para tarefas novas",
	},
];

const screenerQuestions: Question[] = [
	// Estado e município são duas perguntas, e não um seletor único que devolve dois
	// valores: são dois dados distintos na análise — recorte por unidade federativa é
	// uma consulta, recorte por município é outra — e guardá-los assim mantém o valor
	// gravado igual ao valor escolhido, sem desmembramento no meio do caminho. Em
	// runtime, cada opção resolvida a partir do catálogo também tem a forma `Option`
	// (value = código IBGE, key = UF/código, label = nome).
	{
		key: "state",
		scope: "SCREENER",
		position: 0,
		type: "CHOICE",
		required: true,
		label: "Selecione o seu estado",
		options_source: { source: "STATES" },
	},
	{
		key: "city",
		scope: "SCREENER",
		position: 1,
		type: "CHOICE",
		required: true,
		label: "Selecione a sua cidade",
		// A lista sai do estado escolhido acima. Sem o filtro seriam 5.570 municípios
		// numa lista só, com nomes repetidos entre estados.
		options_source: { source: "CITIES", filtered_by: "state" },
	},
	{
		key: "age_range",
		scope: "SCREENER",
		position: 2,
		type: "CHOICE",
		required: true,
		label: "Qual a sua faixa de idade?",
		options: ageRangeOptions,
	},
	{
		key: "education_level",
		scope: "SCREENER",
		position: 3,
		type: "CHOICE",
		required: true,
		label: "Qual a sua escolaridade?",
		options: educationLevelOptions,
	},
	{
		key: "chain_role",
		scope: "SCREENER",
		position: 4,
		type: "CHOICE",
		required: true,
		label: "O que você faz na cadeia de resíduos?",
		helper_text:
			"Independente do perfil que você escolheu, queremos saber sua atividade real.",
		options: chainRoleOptions,
	},
	{
		key: "waste_contact_frequency",
		scope: "SCREENER",
		position: 5,
		type: "SCALE",
		required: true,
		label: "Qual a sua relação com reciclagem e resíduos?",
		helper_text: "Não existe resposta correta.",
		options: wasteContactFrequencyOptions,
	},
	{
		key: "app_experience",
		scope: "SCREENER",
		position: 6,
		type: "SCALE",
		required: true,
		label: "Qual a sua experiência com aplicativos de celular?",
		helper_text: "Não existe resposta correta.",
		options: appExperienceOptions,
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Perguntas de fim de etapa (PER_SUITE)
// ═══════════════════════════════════════════════════════════════════════════

/** Escala de satisfação da etapa, conforme Lima, Oliveira & Santana (2013). */
const satisfactionOptions: Option[] = [
	{ value: 1, key: "TERRIBLE", label: "Péssimo" },
	{ value: 2, key: "BAD", label: "Ruim" },
	{ value: 3, key: "REGULAR", label: "Regular" },
	{ value: 4, key: "GOOD", label: "Bom" },
	{ value: 5, key: "EXCELLENT", label: "Ótimo" },
];

/**
 * Escala de concordância, compartilhada por referência por todos os itens de heurística
 * e de domínio, para que os rótulos não possam divergir entre eles.
 *
 * Os cinco pontos são nomeados, e não só as pontas. A forma com âncoras isoladas vinha
 * da apresentação canônica do SUS, que saiu do instrumento na versão 2.
 */
const agreementOptions: Option[] = [
	{ value: 1, key: "STRONGLY_DISAGREE", label: "Discordo totalmente" },
	{ value: 2, key: "DISAGREE", label: "Discordo" },
	{ value: 3, key: "NEUTRAL", label: "Nem concordo nem discordo" },
	{ value: 4, key: "AGREE", label: "Concordo" },
	{ value: 5, key: "STRONGLY_AGREE", label: "Concordo totalmente" },
];

const perSuiteQuestions: Question[] = [
	{
		key: "satisfaction",
		scope: "PER_SUITE",
		position: 1,
		type: "SCALE",
		required: true,
		label: "Como você avalia sua satisfação com esta etapa?",
		options: satisfactionOptions,
	},
	// ── Itens de heurística (Nielsen, 1994) ──────────────────────────────────
	{
		key: "terms_clarity",
		scope: "PER_SUITE",
		position: 2,
		type: "SCALE",
		required: true,
		// H2 — Correspondência entre o sistema e o mundo real. Vem da P1 da versão 1.
		label:
			"Os termos e as categorias usados nesta etapa fizeram sentido para mim.",
		options: agreementOptions,
	},
	{
		key: "orientation",
		scope: "PER_SUITE",
		position: 3,
		type: "SCALE",
		required: true,
		// H3 — Controle e liberdade do usuário. Metade da P1 da versão 1.
		label: "Sempre soube onde eu estava e como seguir para o próximo passo.",
		options: agreementOptions,
	},
	{
		key: "memory_load",
		scope: "PER_SUITE",
		position: 4,
		type: "SCALE",
		required: true,
		// H6 — Reconhecimento em vez de memorização. A outra metade da P2.
		label:
			"Consegui concluir as tarefas sem precisar guardar na cabeça informações de uma tela para usar em outra.",
		options: agreementOptions,
	},
	{
		key: "system_feedback",
		scope: "PER_SUITE",
		position: 5,
		type: "SCALE",
		required: true,
		// H1 — Visibilidade do status do sistema. Metade da P3 da versão 1.
		label: "O aplicativo deixou claro o que estava acontecendo a cada passo.",
		options: agreementOptions,
	},
	{
		key: "consistency",
		scope: "PER_SUITE",
		position: 6,
		type: "SCALE",
		required: true,
		// H4 — Consistência e padrões. Sem equivalente na versão 1: a heurística ficava
		// a cargo do avaliador, que não existe no formato dentro do aplicativo.
		label: "As telas desta etapa seguiram um padrão parecido entre si.",
		options: agreementOptions,
	},
	{
		key: "visual_clarity",
		scope: "PER_SUITE",
		position: 7,
		type: "SCALE",
		required: true,
		// H8 — Design estético e minimalista. Também sem equivalente na versão 1.
		label: "As telas mostraram o necessário, sem excesso de informação.",
		options: agreementOptions,
	},

	// ── H9, par condicional ──────────────────────────────────────────────────
	//
	// Perguntar a qualidade da mensagem de erro a quem não passou por erro nenhum
	// produz dado sujo, e um item opcional não distinguiria "não houve erro" de "não
	// quis responder". O portão resolve os dois, e a resposta dele é medida por si só:
	// a taxa de etapas com erro é o que cobre H5 — prevenção de erros — que ninguém
	// consegue auto-relatar, porque não se percebe o erro que não aconteceu.
	{
		key: "error_occurred",
		scope: "PER_SUITE",
		position: 8,
		type: "CHOICE",
		required: true,
		label: "Aconteceu algum erro nesta etapa?",
		options: [
			{ value: 1, key: "YES", label: "Sim" },
			{ value: 2, key: "NO", label: "Não" },
		],
	},
	{
		key: "error_recovery",
		scope: "PER_SUITE",
		position: 9,
		type: "SCALE",
		required: true,
		// H9 — Ajudar a reconhecer, diagnosticar e recuperar-se de erros. Metade da P3.
		label:
			"Quando algo deu errado, a mensagem me ajudou a entender o problema.",
		options: agreementOptions,
		depends_on: { question_key: "error_occurred", equals: "YES" },
	},

	// ── Itens de domínio ─────────────────────────────────────────────────────
	//
	// Não correspondem a heurísticas: medem utilidade no ecossistema da reciclagem,
	// não usabilidade.
	{
		key: "personal_value",
		scope: "PER_SUITE",
		position: 10,
		type: "SCALE",
		required: true,
		// Metade da P4 da versão 1.
		label:
			"O que eu fiz nesta etapa resolveria um problema real do meu dia a dia.",
		options: agreementOptions,
	},
	{
		key: "chain_value",
		scope: "PER_SUITE",
		position: 11,
		type: "SCALE",
		required: true,
		// A outra metade da P4.
		label:
			"Esta etapa ajudaria a conectar melhor as pessoas e as empresas da reciclagem.",
		options: agreementOptions,
	},
	{
		key: "expected_features",
		scope: "PER_SUITE",
		position: 12,
		type: "SCALE",
		required: true,
		// Substitui a P5, que pedia sugestões por escrito. A escala mede a distância
		// entre o que a etapa entrega e o que a pessoa esperava dela — diz que falta
		// algo, nunca o quê. O comentário livre do encerramento é o que restou dessa
		// porta.
		label: "Esta etapa tem as funções que eu esperaria encontrar nela.",
		options: agreementOptions,
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Perguntas de encerramento (FINAL)
//
// O SUS saiu na versão 2. Com ele foram embora a alternância de polaridade, a
// pontuação 0–100 e a comparação com a média da indústria (≈ 68). O que sobra é a
// única entrada aberta do instrumento — e, por ser a única, merece destaque na tela.
// ═══════════════════════════════════════════════════════════════════════════

const finalQuestions: Question[] = [
	{
		key: "free_comment",
		scope: "FINAL",
		position: 1,
		type: "TEXT",
		required: false,
		max_length: 4000,
		label: "Quer deixar algum comentário livre sobre a experiência?",
		helper_text:
			"Opcional. Fale do que quiser: o que você adicionaria, removeria ou mudaria.",
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Protocolo
// ═══════════════════════════════════════════════════════════════════════════

export const protocol: Protocol = {
	key: "oikos-walkthrough",
	version: 2,
	tasks,
	suites,
	personas,
	questions: [...screenerQuestions, ...perSuiteQuestions, ...finalQuestions],
};
