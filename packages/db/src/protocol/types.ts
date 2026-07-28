/**
 * Tipos do protocolo do Modo Pesquisa de Usabilidade.
 *
 * A camada de tipos vive separada da de dados porque o schema Drizzle depende dela:
 * `success_rule`, `options` e `depends_on` são colunas JSON e precisam de
 * `$type<...>` para que o compilador verifique o que entra e o que sai do banco. O conjunto
 * de dados — as 17 tarefas, as 6 suítes, as 5 personas e as perguntas — vive em `./data.ts`,
 * no mesmo diretório.
 *
 * Regras que valem para o protocolo inteiro:
 *  - Publicar uma versão nova NUNCA altera o que participantes anteriores viram.
 *    Cada sessão aponta para a versão que executou; versões antigas ficam congeladas.
 *  - Alterar qualquer conteúdo do protocolo exige incrementar `version`.
 *  - Integridade referencial (toda tarefa referenciada existe, nenhum código repetido)
 *    é verificada pelo validador de forma (`./validate.ts`), que quebra a integração
 *    contínua antes do seed rodar. Os `path_pattern` são conferidos contra as rotas reais
 *    pelo teste de contrato, que roda no repositório da API principal.
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

/**
 * Condição de exibição de uma pergunta.
 *
 * Existe para o par de erro: perguntar a qualidade da mensagem de erro a quem não passou
 * por erro nenhum produz dado sujo, e tornar o item opcional não distingue "não houve
 * erro" de "não quis responder". O portão resolve os dois de uma vez, e a resposta dele
 * é dado por si só — a taxa de etapas com erro.
 *
 * `equals` referencia o `key` da opção da pergunta controladora — nunca o `value` ordinal,
 * que pode mudar se as opções forem reordenadas. É genérico de propósito: qualquer
 * pergunta pode depender de qualquer outra do mesmo escopo. O validador de forma recusa
 * dependência para pergunta inexistente, para valor fora das opções dela, e ciclo entre
 * dependências.
 */
export interface QuestionDependency {
	/** Chave da pergunta que controla a exibição. */
	question_key: string;
	/** `key` da opção que a controladora precisa ter para que esta pergunta apareça. */
	equals: string;
}

interface BaseQuestion {
	key: string;
	scope: QuestionScope;
	position: number;
	label: string;
	/** Instrução auxiliar exibida abaixo do enunciado. */
	helper_text?: string;
	/** Texto explicativo mais longo, exibido sob demanda (ícone de informação). */
	info_text?: string;
	/**
	 * Obrigatória quando exibida. Uma pergunta com `depends_on` que não satisfaz a
	 * condição não é exibida e, portanto, não é cobrada.
	 */
	required: boolean;
	/** Ausente = sempre exibida. */
	depends_on?: QuestionDependency;
}

/**
 * Alternativa de uma pergunta de escala (`SCALE`) ou de escolha (`CHOICE`) embutida.
 *
 * Um único tipo para os dois papéis, e não `ScaleOption`/`ChoiceOption` separados: a
 * distinção anterior fazia `value` ser `number` numa e `string` na outra, dois tipos para
 * o mesmo papel. Aqui `value` é sempre a posição ordinal (útil para pontuação/ordenação),
 * `key` é o identificador estável usado por `depends_on.equals` e por quem lê a resposta
 * (era o que `ChoiceOption.value` fazia antes), e `label` é o texto de exibição — sempre
 * obrigatório: sem pesquisador ao lado, uma opção sem nome obriga a pessoa a adivinhar o
 * que ela significa, e o público inclui participantes com pouca ou nenhuma escolaridade
 * formal.
 */
export interface Option {
	value: number;
	key: string;
	label: string;
}

/** Escala ordinal. As opções vivem na própria pergunta. */
export interface ScaleQuestion extends BaseQuestion {
	type: "SCALE";
	options: Option[];
}

/** Escolha única entre as opções embutidas na própria pergunta. */
export interface ChoiceQuestion extends BaseQuestion {
	type: "CHOICE";
	options: Option[];
}

export interface TextQuestion extends BaseQuestion {
	type: "TEXT";
	max_length: number;
}

export type Question = ScaleQuestion | ChoiceQuestion | TextQuestion;

/** `undefined` para `TEXT`, que não tem opções. */
export function questionOptions(question: Question): Option[] | undefined {
	return "options" in question ? question.options : undefined;
}

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
