/**
 * Tipos do protocolo do Modo Pesquisa de Usabilidade.
 *
 * A camada de tipos vive separada da de dados porque o schema Drizzle depende dela:
 * `success_rule` e `options` são colunas JSON e precisam de `$type<...>` para que o
 * compilador verifique o que entra e o que sai do banco. O conjunto de dados — as 17
 * tarefas, as 6 suítes, as personas e as perguntas — chega em S02, no mesmo diretório.
 *
 * Regras que valem para o protocolo inteiro:
 *  - Publicar uma versão nova NUNCA altera o que participantes anteriores viram.
 *    Cada sessão aponta para a versão que executou; versões antigas ficam congeladas.
 *  - Alterar qualquer conteúdo do protocolo exige incrementar `version`.
 *  - Integridade referencial (toda tarefa referenciada existe, nenhum código repetido)
 *    é verificada pelo validador de forma, que quebra a integração contínua antes do
 *    seed rodar. Os `path_pattern` são conferidos contra as rotas reais pelo teste de
 *    contrato, que roda no repositório da API principal.
 *
 * Referência do instrumento: mestrado/plans/oikos-walkthrough.md (§4, §6.6, §7) e os
 * cinco formulários aplicados no Google Forms.
 */

export type PersonaKey =
	| "COLLECTOR"
	| "RECYCLING_COMPANY"
	| "GENERAL_COMPANY"
	| "CITIZEN"
	| "GOVERNMENT";

export type SuiteCode = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export type TaskCode =
	| "T1"
	| "T2"
	| "T3"
	| "T4"
	| "T5"
	| "T6"
	| "T7"
	| "T8"
	| "T9"
	| "T10"
	| "T11"
	| "T12"
	| "T13"
	| "T14"
	| "T15"
	| "T16"
	| "T17";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Sinal de conclusão observado pelo aplicativo.
 *
 * `api`    — uma requisição casou método, padrão de rota e status.
 *            `query` distingue tarefas que compartilham o mesmo endpoint: filtrar por
 *            resíduo e filtrar por periculosidade são ambos GET no mapa de denúncias,
 *            e só os parâmetros os separam. Valor `true` significa "o parâmetro precisa
 *            estar presente, com qualquer valor".
 *
 * `screen` — o participante chegou a uma tela. Necessário para tarefas puramente de
 *            leitura, em que os dados já foram carregados antes e nenhuma requisição
 *            nova acontece.
 */
export type SuccessSignal =
	| {
			kind: "api";
			method: HttpMethod;
			path_pattern: string;
			status: number;
			query?: Record<string, string | true>;
	  }
	| {
			kind: "screen";
			route: string;
	  };

/**
 * `any` — qualquer sinal conclui a tarefa.
 * `all` — todos precisam ocorrer. Usado quando a tarefa pede mais de uma ação, como
 *         cadastrar um resíduo E um serviço.
 */
export interface SuccessRule {
	mode: "any" | "all";
	signals: SuccessSignal[];
}

export interface Task {
	code: TaskCode;
	title: string;
	/** Enunciado exibido ao participante, na segunda pessoa. */
	instruction: string;
	success: SuccessRule;
}

export interface Suite {
	code: SuiteCode;
	/** Título exibido ao participante. Na interface, chamamos de "etapa". */
	title: string;
	/** Objetivo em linguagem direta, exibido na abertura da etapa. */
	objective: string;
	/** Tarefas na ordem de execução. Referência por código evita duplicar definição. */
	task_codes: TaskCode[];
}

export interface Persona {
	key: PersonaKey;
	label: string;
	/** Frase que ajuda o participante a se reconhecer, reduzindo escolha equivocada. */
	description: string;
	/** Roteiro estrito: exatamente estas suítes, nesta ordem. */
	suite_codes: SuiteCode[];
}

/**
 * Momento em que a pergunta é feita.
 *
 * `SCREENER`  — uma vez, antes de começar. Caracteriza o participante.
 * `PER_SUITE` — ao fim de cada etapa.
 * `FINAL`     — uma vez, ao fim de tudo.
 */
export type QuestionScope = "SCREENER" | "PER_SUITE" | "FINAL";

interface BaseQuestion {
	key: string;
	scope: QuestionScope;
	position: number;
	label: string;
	/** Instrução auxiliar exibida abaixo do enunciado. */
	helper_text?: string;
	required: boolean;
}

/** Ponto de uma escala ordinal. `label` ausente quando só as âncoras rotulam. */
export interface ScaleOption {
	value: number;
	label?: string;
}

/** Escala ordinal numérica. As opções vivem na própria pergunta. */
export interface ScaleQuestion extends BaseQuestion {
	type: "SCALE";
	options: ScaleOption[];
	anchor_min?: string;
	anchor_max?: string;
	/**
	 * Repete as âncoras em cada item, e não só no topo do bloco.
	 * Exigência do SUS na forma mista: reduz marcação em coluna reta.
	 */
	repeat_anchors?: boolean;
	/** Apenas itens do SUS. Define se o valor é invertido no cálculo. */
	polarity?: "POSITIVE" | "NEGATIVE";
	/**
	 * Entra na pontuação 0–100 do SUS. Só os dez itens canônicos podem ser `true` —
	 * um décimo primeiro item quebraria a comparabilidade com o benchmark.
	 */
	in_sus_score?: boolean;
}

/** Escolha única entre valores nomeados, sem ordem implícita de intensidade. */
export interface ChoiceOption {
	value: string;
	label: string;
}

export interface ChoiceQuestion extends BaseQuestion {
	type: "CHOICE";
	options: ChoiceOption[];
}

export interface TextQuestion extends BaseQuestion {
	type: "TEXT";
	max_length: number;
}

/**
 * Seletor de unidade federativa e município, alimentado pela listagem oficial que o
 * aplicativo já consome. Produz dois valores, `state_uf` e `city_name`, sempre
 * escolhidos em lista — nunca digitados — o que elimina erro ortográfico.
 */
export interface LocationQuestion extends BaseQuestion {
	type: "LOCATION";
}

export type Question =
	| ScaleQuestion
	| ChoiceQuestion
	| TextQuestion
	| LocationQuestion;

export interface Protocol {
	key: string;
	version: number;
	tasks: Task[];
	suites: Suite[];
	personas: Persona[];
	/**
	 * Conjunto único, idêntico para todas as personas — confirmado nos cinco
	 * formulários aplicados, em que só variava quantos blocos de suíte cada um tinha.
	 * O aplicativo agrupa por `scope` para saber quando exibir cada pergunta.
	 */
	questions: Question[];
}
