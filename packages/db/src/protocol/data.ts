import type { Option, Persona, Protocol, Question, Suite, Task } from "./types";

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
		title: "Aumentar o raio de busca",
		instruction:
			"Na seção de pontos de coleta, aumente o raio de busca — o padrão é 2 km — para um valor maior, como 5 km ou 10 km.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/market",
					status: 200,
					query: { radius: { not: "2000" } },
				},
			],
		},
	},
	{
		code: "T9",
		title: "Filtrar por categoria de resíduo ou serviço apenas",
		instruction:
			"Na lista de pontos de coleta, use o filtro para encontrar empresas que aceitem um tipo específico de resíduo.",
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
		title: "Pesquisar por texto",
		instruction:
			"Faça uma pesquisa textual: procure por uma empresa, um serviço ou um resíduo pelo nome.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/market",
					status: 200,
					query: { q: true },
				},
			],
		},
	},
	{
		code: "T11",
		title: "Visualizar os detalhes de uma empresa",
		instruction:
			"Selecione uma empresa da lista e veja todos os seus dados: endereço, horários, resíduos aceitos, serviços oferecidos e contato.",
		success: {
			mode: "any",
			signals: [{ kind: "screen", route: "/market/[companyId]" }],
		},
	},
	{
		code: "T12",
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
		code: "T13",
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
					query: { status: { not: "OPEN" } },
				},
			],
		},
	},
	{
		code: "T14",
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
		code: "T15",
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
		code: "T16",
		title: "Criar uma denúncia",
		instruction:
			"Registre uma denúncia de descarte irregular: informe o local, adicione uma foto ou vídeo, escreva suas observações e selecione as categorias de resíduo que você identificou.",
		success: {
			mode: "all",
			signals: [
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints",
					status: 200,
				},
				{
					kind: "api",
					method: "POST",
					path_pattern: "/v1/complaints/:id/attachments",
					status: 200,
				},
			],
		},
	},
	{
		code: "T17",
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
					status: 200,
				},
			],
		},
	},
	{
		code: "T18",
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
					status: 204,
				},
			],
		},
	},
];

const suites: Suite[] = [
	{
		code: "S1",
		title: "Exploração livre",
		objective:
			"Antes de criar uma conta, explore o aplicativo livremente. Pesquise pontos de coleta e veja o que é possível visualizar nas denúncias sem estar logado.",
		task_codes: ["T8", "T9", "T10", "T11", "T12", "T13", "T14", "T15"],
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
		task_codes: ["T8", "T9", "T11"],
	},
	{
		code: "S5",
		title: "Fiscalização e atuação pública",
		objective:
			"Imagine que você representa um órgão público. Cadastre o órgão para expor os serviços que oferece à população. Depois, use os filtros de denúncia para definir prioridades de atendimento e registre uma resolução.",
		task_codes: ["T4", "T5", "T6", "T7", "T12", "T13", "T14", "T15", "T18"],
	},
	{
		code: "S6",
		title: "Participação cidadã",
		objective:
			"Imagine que você é morador da cidade e quer participar da gestão de resíduos: encontre onde descartar, registre uma denúncia de descarte irregular, explore as denúncias existentes, vote em uma delas e poste uma resolução.",
		task_codes: [
			"T8",
			"T9",
			"T11",
			"T16",
			"T12",
			"T13",
			"T14",
			"T15",
			"T17",
			"T18",
		],
	},
];

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
	{
		key: "state",
		scope: "SCREENER",
		position: 0,
		type: "TEXT",
		required: true,
		label: "Selecione o seu estado",
		max_length: 64,
	},
	{
		key: "city",
		scope: "SCREENER",
		position: 1,
		type: "TEXT",
		required: true,
		label: "Selecione a sua cidade",
		max_length: 128,
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

const satisfactionOptions: Option[] = [
	{ value: 1, key: "TERRIBLE", label: "Péssimo" },
	{ value: 2, key: "BAD", label: "Ruim" },
	{ value: 3, key: "REGULAR", label: "Regular" },
	{ value: 4, key: "GOOD", label: "Bom" },
	{ value: 5, key: "EXCELLENT", label: "Ótimo" },
];

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
		info_text:
			"Pense no conjunto da etapa: se foi fácil, agradável e sem complicação usar o aplicativo até aqui. Não é sobre o assunto da reciclagem, é sobre a experiência de usar o aplicativo em si.",
		options: satisfactionOptions,
	},
	{
		key: "terms_clarity",
		scope: "PER_SUITE",
		position: 2,
		type: "SCALE",
		required: true,
		label:
			"Os termos e as categorias usados nesta etapa fizeram sentido para mim.",
		info_text:
			"Pense nos nomes e palavras usados nas telas: nomes de botões, categorias de resíduo, títulos de seção. Eles fizeram sentido pra você ou pareceram estranhos, técnicos demais ou confusos?",
		options: agreementOptions,
	},
	{
		key: "orientation",
		scope: "PER_SUITE",
		position: 3,
		type: "SCALE",
		required: true,
		label: "Sempre soube onde eu estava e como seguir para o próximo passo.",
		info_text:
			"Pense se, durante a etapa, você sempre soube em que parte do aplicativo estava e o que fazer para continuar, sem se sentir perdido ou sem saber para onde ir.",
		options: agreementOptions,
	},
	{
		key: "memory_load",
		scope: "PER_SUITE",
		position: 4,
		type: "SCALE",
		required: true,
		label:
			"Consegui concluir as tarefas sem precisar guardar na cabeça informações de uma tela para usar em outra.",
		info_text:
			"Pense se você precisou lembrar de números, nomes ou dados de uma tela para usar em outra tela mais à frente, ou se o aplicativo sempre mostrou o que você precisava na hora certa.",
		options: agreementOptions,
	},
	{
		key: "system_feedback",
		scope: "PER_SUITE",
		position: 5,
		type: "SCALE",
		required: true,
		label: "O aplicativo deixou claro o que estava acontecendo a cada passo.",
		info_text:
			"Pense se o aplicativo sempre avisou o que estava acontecendo: se uma ação deu certo, se algo estava carregando, ou se faltava alguma informação para continuar.",
		options: agreementOptions,
	},
	{
		key: "consistency",
		scope: "PER_SUITE",
		position: 6,
		type: "SCALE",
		required: true,
		label: "As telas desta etapa seguiram um padrão parecido entre si.",
		info_text:
			"Pense se os botões, cores, textos e formas de navegar se repetiram do mesmo jeito nas telas desta etapa, ou se cada tela parecia funcionar de um jeito diferente.",
		options: agreementOptions,
	},
	{
		key: "visual_clarity",
		scope: "PER_SUITE",
		position: 7,
		type: "SCALE",
		required: true,
		label: "As telas mostraram o necessário, sem excesso de informação.",
		info_text:
			"Pense se as telas mostraram só o que você precisava para fazer a tarefa, ou se pareciam cheias de informação, botões ou textos que não ajudavam em nada.",
		options: agreementOptions,
	},
	{
		key: "error_occurred",
		scope: "PER_SUITE",
		position: 8,
		type: "CHOICE",
		required: true,
		label: "Aconteceu algum erro nesta etapa?",
		info_text:
			"Considere erro qualquer coisa que não funcionou como devia: uma mensagem de erro, uma tela que travou, um botão que não fez nada, ou uma ação que você tentou e não deu certo.",
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
		label:
			"Quando algo deu errado, a mensagem me ajudou a entender o problema.",
		info_text:
			"Pense na mensagem ou aviso que apareceu quando algo deu errado: ela explicou o que aconteceu e o que fazer para resolver, ou só mostrou um erro sem explicação?",
		options: agreementOptions,
		depends_on: { question_key: "error_occurred", equals: "YES" },
	},
	{
		key: "personal_value",
		scope: "PER_SUITE",
		position: 10,
		type: "SCALE",
		required: true,
		label:
			"O que eu fiz nesta etapa resolveria um problema real do meu dia a dia.",
		info_text:
			"Pense se as tarefas que você fez nesta etapa seriam realmente úteis para você fora deste teste, resolvendo algo que você precisaria fazer de verdade no seu dia a dia.",
		options: agreementOptions,
	},
	{
		key: "chain_value",
		scope: "PER_SUITE",
		position: 11,
		type: "SCALE",
		required: true,
		label:
			"Esta etapa ajudaria a conectar melhor as pessoas e as empresas da reciclagem.",
		info_text:
			"Pense se o que você fez nesta etapa ajudaria a aproximar quem coleta, quem recicla, quem gera resíduo e quem fiscaliza — facilitando que essas pessoas e empresas se encontrem e resolvam problemas juntas.",
		options: agreementOptions,
	},
];

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

export const protocol: Protocol = {
	key: "oikos-walkthrough",
	version: 6,
	tasks,
	suites,
	personas,
	questions: [...screenerQuestions, ...perSuiteQuestions, ...finalQuestions],
};
