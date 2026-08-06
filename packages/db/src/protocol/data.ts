import type { Option, Persona, Protocol, Question, Suite, Task } from "./types";

const tasks: Task[] = [
	{
		code: "T1",
		title: "Criar uma conta",
		instruction:
			"Abra a aba HOME e procure a opção de criar conta. Cadastre-se no Oikos usando seu e-mail e uma senha de sua escolha. Guarde essa senha, porque você vai usá-la no próximo passo.",
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
			"Entre no aplicativo com o e-mail e a senha que você acabou de cadastrar. Se o aplicativo já tiver entrado sozinho depois do cadastro, saia da conta e faça o login novamente, para percorrer a tela de entrada.",
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
			"Abra a aba HOME e acesse PERFIL. Preencha seus dados pessoais (nome completo e telefone), depois o endereço (CEP, rua, número, bairro, cidade e estado) e, por fim, adicione uma foto de perfil. Salve antes de sair da tela.",
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
			"Abra a aba HOME e procure a opção de cadastrar uma empresa ou ponto de coleta. Informe o nome fantasia (como as pessoas conhecem o negócio), a razão social, o tipo, o número de identificação (CPF ou CNPJ) e um telefone de contato.",
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
			"Abra a empresa que você acabou de cadastrar e preencha o endereço completo: CEP, rua, número, bairro, cidade e estado. É esse endereço que posiciona a empresa no mapa e faz ela aparecer nas buscas por proximidade.",
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
			"Ainda na empresa que você cadastrou, configure os horários de funcionamento. Marque em quais dias da semana ela atende e informe o horário de abertura e de fechamento de cada um, deixando de fora os dias em que ela não abre.",
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
			"Ainda na empresa que você cadastrou, adicione pelo menos um resíduo que ela aceita (papelão ou plástico, por exemplo) e informe o preço por unidade de medida. Em seguida, adicione pelo menos um serviço oferecido, como coleta sob demanda. São esses itens que aparecem para quem procura destinar resíduo.",
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
			"Abra a aba PONTOS DE COLETA e localize o controle de raio de busca, que vem configurado em 2 km. Aumente esse raio para um valor maior, como 5 km ou 10 km, e repare como a lista de empresas muda.",
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
			"Na aba PONTOS DE COLETA, abra os filtros e escolha um tipo específico de resíduo ou serviço. Confira se a lista passa a mostrar apenas as empresas que atendem ao que você filtrou.",
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
			"Na aba PONTOS DE COLETA, use o campo de busca por texto e procure pelo nome de uma empresa, de um serviço ou de um resíduo. Veja se o resultado corresponde ao que você digitou.",
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
			],
		},
	},
	{
		code: "T13",
		title: "Filtrar denúncias por status",
		instruction:
			"Na aba DENÚNCIAS, abra os filtros e deixe visíveis apenas as denúncias em aberto. Depois troque o filtro para mostrar somente as resolvidas e compare o que aparece no mapa em cada situação.",
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
			"Na aba DENÚNCIAS, use os filtros para exibir apenas as denúncias de um tipo específico de resíduo, como entulho ou material eletrônico. Observe quantas denúncias sobram no mapa depois de filtrar.",
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
			"Na aba DENÚNCIAS, use o filtro de nível de perigo e deixe visíveis apenas as denúncias de alta ou muito alta periculosidade. É esse recorte que ajuda a decidir o que precisa de atendimento primeiro.",
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
	{
		code: "T20",
		title: "Encontrar sua própria empresa em Pontos de Coleta",
		instruction:
			"Volte para a aba PONTOS DE COLETA e procure a empresa que você acabou de cadastrar, como faria um cliente à procura dela. Abra o resultado e confirme se o endereço, os horários, os resíduos e os serviços aparecem exatamente como você preencheu.",
		success: {
			mode: "any",
			signals: [{ kind: "screen", route: "/market/[companyId]" }],
		},
	},
];

const suites: Suite[] = [
	{
		code: "S1",
		title: "Exploração livre",
		objective:
			"Esta etapa mostra o que o Oikos oferece antes de qualquer cadastro. Você vai percorrer as abas PONTOS DE COLETA e DENÚNCIAS sem estar logado, usando busca, filtros e mapa para ver até onde dá para chegar sem conta. O que queremos entender é se essas funções respondem bem e se a experiência faz sentido para quem ainda está decidindo se vale a pena se cadastrar.",
		task_codes: ["T8", "T9", "T10", "T11", "T12", "T13", "T14", "T15"],
	},
	{
		code: "S2",
		title: "Registro e perfil",
		objective:
			"Agora que você já explorou o aplicativo, é hora de criar sua identidade dentro dele. Nesta etapa você vai criar uma conta, entrar com ela e preencher o perfil com seus dados, seu endereço e uma foto. O que queremos entender é se esse caminho do cadastro até o perfil completo é claro, se os campos pedidos fazem sentido e se em algum ponto você fica em dúvida sobre o que preencher.",
		task_codes: ["T1", "T2", "T3"],
	},
	{
		code: "S3",
		title: "Exposição ao ecossistema",
		objective:
			"Imagine que você quer que pessoas e empresas da região encontrem o seu negócio ou ponto de coleta. Nesta etapa você vai cadastrar sua empresa do zero: primeiro os dados de identificação, depois o endereço, os horários de funcionamento e por fim os resíduos e serviços. No final, você vai procurá-la na aba PONTOS DE COLETA, como um cliente faria, para conferir se ela aparece do jeito que você cadastrou.",
		task_codes: ["T4", "T5", "T6", "T7", "T20"],
	},
	{
		code: "S5",
		title: "Fiscalização e atuação pública",
		objective:
			"Imagine que você representa um órgão público e precisa tanto divulgar o que a instituição oferece quanto agir sobre problemas ambientais da cidade. Nesta etapa você vai cadastrar o órgão com endereço, horários e serviços prestados à população. Depois vai atuar sobre as denúncias na aba DENÚNCIAS: registrar uma ocorrência de campo, avaliar a denúncia de outra pessoa pelo voto e documentar uma resolução.",
		task_codes: ["T4", "T5", "T6", "T7", "T16", "T17", "T18"],
	},
	{
		code: "S6",
		title: "Participação cidadã",
		objective:
			"Imagine que você mora na cidade, já tem conta no Oikos e encontrou lixo descartado no lugar errado perto de casa. Nesta etapa você vai percorrer o ciclo completo de quem participa: registrar a denúncia com foto e localização, reabrir essa denúncia na lista para acompanhar como ela ficou, votar na denúncia de um vizinho e publicar uma resolução. A ideia é sentir se dá para sair do problema até o encerramento sem travar no caminho.",
		task_codes: ["T16", "T19", "T17", "T18"],
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
					"Passe pela aba DENÚNCIAS e veja os pontos de descarte irregular do mapa. Muitos deles indicam material recolhível que ainda não teve destino.",
				],
			},
			{
				suite_code: "S2",
				specific_objectives: [
					"Preencha o perfil pensando em quem vai te contratar. Nome e telefone corretos são o que permitem que essa pessoa chegue até você.",
					"Adicione uma foto de perfil. Em uma negociação feita à distância, é ela que dá rosto ao seu trabalho e ajuda a construir confiança antes do primeiro contato.",
				],
			},
			{
				suite_code: "S3",
				specific_objectives: [
					"Cadastre seu ponto de coleta com nome, documento e telefone. São esses dados que identificam você para quem procurar por coleta na região.",
					"Informe o endereço completo. É ele que coloca você no mapa e faz seu serviço aparecer para quem busca por proximidade.",
					"Configure os horários em que você realmente atende, deixando de fora os dias parados. Horário errado gera viagem perdida dos dois lados.",
					"Cadastre os resíduos que você aceita e os serviços que oferece, com preço por unidade. Depois procure seu ponto na aba PONTOS DE COLETA e confira se ele aparece como você espera.",
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
					"Passe pela aba DENÚNCIAS e observe as ocorrências da região. Elas mostram onde há material sendo descartado sem destino correto.",
				],
			},
			{
				suite_code: "S2",
				specific_objectives: [
					"Preencha o perfil com atenção aos dados de contato. É por eles que fornecedores e clientes vão chegar até a sua empresa depois.",
					"Adicione o endereço e uma foto. Esse perfil pessoal é o que responde por você antes de a empresa entrar em cena, na próxima etapa.",
				],
			},
			{
				suite_code: "S3",
				specific_objectives: [
					"Cadastre a empresa com nome fantasia, razão social e CNPJ. É essa identificação que dá credibilidade a quem for negociar com você.",
					"Informe o endereço completo, que posiciona a empresa no mapa e faz ela aparecer nas buscas por proximidade.",
					"Configure os horários de recebimento de material, para que ninguém apareça com carga fora do expediente.",
					"Cadastre os resíduos que você compra e o preço por unidade de medida. É essa tabela que atrai fornecedores. Depois procure sua empresa na aba PONTOS DE COLETA e confira se os preços aparecem corretamente.",
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
				],
			},
			{
				suite_code: "S2",
				specific_objectives: [
					"Preencha seus dados pessoais e o endereço. Como você não vai cadastrar uma empresa nesta pesquisa, é esse perfil que identifica você ao procurar coletores.",
					"Adicione uma foto de perfil e salve. Um perfil completo dá mais segurança a quem for te atender do outro lado.",
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
					"Passe pela aba DENÚNCIAS e veja os problemas já registrados no seu bairro. Tudo isso aparece sem login, e é com base nisso que você decide se vale a pena criar uma conta.",
				],
			},
			{
				suite_code: "S2",
				specific_objectives: [
					"Preencha seus dados e o endereço. É esse perfil que vai assinar as denúncias que você registrar daqui em diante.",
					"Adicione uma foto de perfil. Em uma denúncia, ela ajuda os vizinhos a reconhecerem que existe uma pessoa real por trás do relato.",
				],
			},
			{
				suite_code: "S6",
				specific_objectives: [
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
					"Abra a aba DENÚNCIAS e experimente os filtros por situação, por categoria de resíduo e por nível de periculosidade. São exatamente os mesmos que você vai usar depois, já como órgão cadastrado, para decidir o que atender primeiro.",
					"Repare que todo esse panorama aparece sem login, ou seja, qualquer cidadão enxerga os mesmos problemas que a fiscalização enxerga.",
					"Passe pela aba PONTOS DE COLETA e veja que estrutura de coleta já existe na região, pública ou privada.",
				],
			},
			{
				suite_code: "S2",
				specific_objectives: [
					"Preencha aqui o seu perfil pessoal, como servidor. O cadastro da instituição que você representa vem na etapa seguinte.",
					"Complete o endereço e adicione uma foto. É esse perfil que responde pelas ações que você registrar em nome do órgão.",
				],
			},
			{
				suite_code: "S5",
				specific_objectives: [
					"Cadastre a instituição com nome, CNPJ e contato, como faria na vida real. É esse registro que dá caráter oficial à presença do órgão no aplicativo.",
					"Informe endereço e horários de atendimento ao público, para que o cidadão saiba quando e onde procurar vocês.",
					"Cadastre os serviços prestados, como ecopontos, coleta especial e recebimento de material perigoso. É isso que a população encontra ao buscar pelo órgão.",
					"Na aba DENÚNCIAS, registre uma ocorrência encontrada em campo, avalie pelo voto a denúncia feita por um cidadão e documente a resolução tomada pelo órgão.",
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
	version: 9,
	tasks,
	suites,
	personas,
	questions: [...screenerQuestions, ...perSuiteQuestions, ...finalQuestions],
};
