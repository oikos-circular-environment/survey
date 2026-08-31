import type { Option, Persona, Protocol, Question, Suite, Task } from "./types";

const tasks: Task[] = [
	{
		code: "T8",
		title: "Usar os filtros de Pontos de Coleta",
		instruction:
			"Abra a aba PONTOS DE COLETA e experimente os filtros e a busca do jeito que fizer mais sentido pra você: ajuste o raio, escolha uma categoria de resíduo ou serviço, ou procure por um termo no campo de busca. Use quantos quiser, na ordem que preferir, e repare como a lista de empresas muda a cada ajuste.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/market",
					status: 200,
					query: { radius: { not: "10000" } },
				},
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/market",
					status: 200,
					query: { category: true },
				},
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
			"Na aba PONTOS DE COLETA, toque em uma empresa da lista para abrir os detalhes dela. Percorra a tela inteira e observe o endereço, os horários de funcionamento, os resíduos aceitos, os serviços oferecidos e as formas de contato.",
		success: {
			mode: "any",
			signals: [{ kind: "screen", route: "/market/[companyId]" }],
		},
	},
	{
		code: "T12",
		title: "Visualizar o mapa de denúncias",
		instruction:
			"Abra a aba DENÚNCIAS e veja o mapa com as denúncias de descarte irregular já registradas na sua região. Movimente o mapa e toque em alguns marcadores para entender o que cada um representa.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
				},
				{ kind: "screen", route: "/complaints" },
			],
		},
	},
	{
		code: "T13",
		title: "Usar os filtros de Denúncias",
		instruction:
			"Na aba DENÚNCIAS, experimente os filtros do jeito que fizer mais sentido pra você: mude o status, escolha uma categoria de resíduo ou selecione um nível de periculosidade. Use quantos quiser, na ordem que preferir, e veja como o mapa muda a cada ajuste.",
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
				{
					kind: "api",
					method: "GET",
					path_pattern: "/v1/complaints/map",
					status: 200,
					query: { waste_category_id: true },
				},
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
			"Abra a aba DENÚNCIAS e inicie o registro de uma nova denúncia de descarte irregular. Marque o local no mapa, adicione uma foto ou um vídeo, escreva o que você observou e selecione as categorias de resíduo que identificou. Confira os dados antes de enviar.",
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
			"Na aba DENÚNCIAS, abra uma denúncia registrada por outra pessoa e use a votação para indicar se, na sua avaliação, o problema já foi resolvido ou continua em aberto. É esse voto da comunidade que define quando uma denúncia pode ser encerrada.",
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
			"Na aba DENÚNCIAS, escolha uma denúncia e publique uma resolução descrevendo a ação tomada para resolver o problema, como a retirada do material ou a limpeza do local. Se você cadastrou uma empresa nesta pesquisa, vincule a resolução a ela.",
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
	{
		code: "T19",
		title: "Abrir uma denúncia sua na lista",
		instruction:
			"Na aba DENÚNCIAS, alterne do mapa para a lista, que reúne as denúncias que você mesmo registrou. Toque em uma delas e percorra os detalhes completos: fotos, categorias, situação atual e votos recebidos.",
		success: {
			mode: "any",
			signals: [
				{
					kind: "event",
					name: "complaint.opened",
					payload: { source: "list" },
				},
			],
		},
	},
];

const suites: Suite[] = [
	{
		code: "S1",
		title: "Teste de Usabilidade",
		objective:
			"Nesta etapa você vai usar o Oikos como um todo, sem pausas entre partes: navegue pelas abas PONTOS DE COLETA e DENÚNCIAS, use os filtros e a busca do jeito que fizer mais sentido pra você, veja o mapa de denúncias da sua região e, quando quiser, registre uma denúncia própria com foto e localização, acompanhe-a na lista, vote na denúncia de outra pessoa e publique uma resolução. Não existe ordem certa — a ideia é sentir se o caminho flui do início ao fim sem travar.",
		task_codes: ["T8", "T11", "T12", "T13", "T16", "T17", "T18", "T19"],
	},
];

const personas: Persona[] = [
	{
		key: "COLLECTOR",
		label: "Coletor(a)",
		description:
			"Você coleta materiais recicláveis, por conta própria ou em cooperativa.",
		suites: [
			{
				suite_code: "S1",
				specific_objectives: [
					"Explore a aba PONTOS DE COLETA pensando em quem compra o material que você recolhe. Use a busca e os filtros para procurar empresas que aceitem papelão, plástico ou metal.",
					"Repare no raio de busca e nos horários de funcionamento. São eles que dizem se vale a pena percorrer a distância até aquele comprador.",
					"Passe pela aba DENÚNCIAS e use os filtros para ver os pontos de descarte irregular da sua região. Muitos deles indicam material recolhível que ainda não teve destino.",
					"Se lembrar de um ponto de descarte irregular do seu percurso de coleta, registre uma denúncia com foto e localização, como se tivesse encontrado material recolhível largado no lugar errado. Depois abra sua denúncia na lista e confira como ela ficou.",
					"Vote na denúncia de outra pessoa e publique uma resolução em alguma denúncia, como faria se tivesse ido até lá buscar aquele material.",
				],
			},
		],
	},
	{
		key: "RECYCLING_COMPANY",
		label: "Empresa de reciclagem",
		description:
			"Sua empresa coleta, tria, processa ou revende materiais recicláveis.",
		suites: [
			{
				suite_code: "S1",
				specific_objectives: [
					"Explore a aba PONTOS DE COLETA procurando fornecedores: coletores e empresas que possam levar material reciclável até você. Use a busca por texto e o filtro por tipo de resíduo.",
					"Aumente o raio de busca e veja como isso muda o volume de fornecedores ao seu alcance. Esse é o raio que define sua área de captação.",
					"Passe pela aba DENÚNCIAS e use os filtros para observar as ocorrências da região. Elas mostram onde há material sendo descartado sem destino correto.",
					"Registre uma denúncia como quem identificou, em campo, material reciclável descartado sem destino. Depois abra sua denúncia na lista e confira os detalhes.",
					"Vote na denúncia de outra pessoa e publique uma resolução, como faria sua empresa ao dar destino correto ao material encontrado.",
				],
			},
		],
	},
	{
		key: "GENERAL_COMPANY",
		label: "Empresa comum",
		description:
			"Sua empresa gera resíduos mas não trabalha com reciclagem, como comércio, restaurante, escritório ou prestadora de serviço.",
		suites: [
			{
				suite_code: "S1",
				specific_objectives: [
					"Explore a aba PONTOS DE COLETA como quem precisa dar destino ao resíduo do próprio negócio. Procure quem recolhe o que a sua empresa descarta com mais frequência.",
					"Use o filtro por tipo de resíduo e por serviço para ver quem faz coleta sob demanda, que costuma ser o formato que atende comércio e escritório.",
					"Confira horários e distância antes de decidir. São eles que dizem se aquele coletor consegue atender sua rotina.",
					"Passe pela aba DENÚNCIAS e use os filtros para ver os problemas registrados perto do seu negócio.",
					"Registre uma denúncia como quem encontrou descarte irregular nas proximidades da empresa, depois abra-a na lista, vote na denúncia de outra pessoa e publique uma resolução.",
				],
			},
		],
	},
	{
		key: "CITIZEN",
		label: "Cidadão",
		description:
			"Você mora na cidade, gera resíduo doméstico e quer saber onde descartar corretamente.",
		suites: [
			{
				suite_code: "S1",
				specific_objectives: [
					"Explore a aba PONTOS DE COLETA procurando onde descartar o que sai da sua casa, como vidro, óleo de cozinha, pilhas ou eletrônicos.",
					"Ajuste o raio de busca para o que dá para percorrer a pé ou de carro no dia a dia, e veja quantas opções sobram perto de você.",
					"Passe pela aba DENÚNCIAS e use os filtros para ver os problemas já registrados no seu bairro.",
					"Registre uma denúncia de descarte irregular com foto e localização, como se tivesse encontrado o problema na rua onde mora.",
					"Abra a lista de denúncias e reveja a que você acabou de criar, conferindo se ficou clara para quem for ler depois.",
					"Vote em uma denúncia registrada por outra pessoa, indicando se o problema ainda existe ou já foi resolvido.",
					"Publique uma resolução em uma denúncia, descrevendo o que foi feito para resolver. É assim que o ciclo se encerra dentro do aplicativo.",
				],
			},
		],
	},
	{
		key: "GOVERNMENT",
		label: "Órgão público",
		description:
			"Você trabalha em uma instituição pública ligada a regulamentação, fiscalização ou gestão ambiental.",
		suites: [
			{
				suite_code: "S1",
				specific_objectives: [
					"Abra a aba DENÚNCIAS e experimente os filtros por situação, por categoria de resíduo e por nível de periculosidade. São exatamente os que você usaria, como órgão fiscalizador, para decidir o que atender primeiro.",
					"Repare que esse é o mesmo panorama que qualquer cidadão enxerga — os problemas que a fiscalização vê são os mesmos que aparecem para a população.",
					"Passe pela aba PONTOS DE COLETA e veja que estrutura de coleta já existe na região, pública ou privada.",
					"Na aba DENÚNCIAS, registre uma ocorrência encontrada em campo, como faria um agente de fiscalização.",
					"Abra a denúncia que você registrou na lista, avalie pelo voto a denúncia feita por um cidadão e documente a resolução tomada em nome do órgão.",
				],
			},
		],
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
		label: "Nunca (não lida com reciclagem ou resíduos em nenhum contexto)",
	},
	{
		value: 2,
		key: "RARELY",
		label:
			"Raramente (contato esporádico, sem regularidade, como separar lixo de vez em quando)",
	},
	{
		value: 3,
		key: "OCCASIONALLY",
		label:
			"Ocasionalmente (contato periódico, mas não é parte central da rotina, como descartar reciclável semanalmente)",
	},
	{
		value: 4,
		key: "FREQUENTLY",
		label:
			"Frequentemente (contato regular e recorrente, pessoal ou profissional, várias vezes por semana)",
	},
	{
		value: 5,
		key: "DAILY",
		label:
			"Diariamente (o tema faz parte da rotina diária, pessoal ou profissionalmente)",
	},
];

const appExperienceOptions: Option[] = [
	{
		value: 1,
		key: "NONE",
		label: "Nenhuma (não uso ou raramente uso celular e aplicativos)",
	},
	{
		value: 2,
		key: "BASIC",
		label:
			"Básica (uso funções simples como ligações e mensagens, com pouca familiaridade com aplicativos)",
	},
	{
		value: 3,
		key: "MODERATE",
		label:
			"Moderada (uso aplicativos do dia a dia como redes sociais, mensagens e mapas com certa autonomia)",
	},
	{
		value: 4,
		key: "ADVANCED",
		label:
			"Avançada (uso vários aplicativos com frequência, incluindo cadastros, formulários e pagamentos)",
	},
	{
		value: 5,
		key: "VERY_ADVANCED",
		label:
			"Muito avançada (uso aplicativos diariamente e sem dificuldade, inclusive para tarefas novas)",
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
			"Pense se o que você fez nesta etapa ajudaria a aproximar quem coleta, quem recicla, quem gera resíduo e quem fiscaliza, facilitando que essas pessoas e empresas se encontrem e resolvam problemas juntas.",
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
	version: 11,
	tasks,
	suites,
	personas,
	questions: [...screenerQuestions, ...perSuiteQuestions, ...finalQuestions],
};
