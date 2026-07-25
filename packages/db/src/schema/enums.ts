/**
 * Conjuntos enumerados do schema.
 *
 * Em MySQL o enum é declarado na própria coluna, então cada conjunto vive aqui como
 * tupla exportada e é usado tanto pelo `mysqlEnum` quanto pela validação de entrada
 * na borda. Um literal escrito duas vezes é um literal que vai divergir.
 *
 * Os conjuntos que também existem como tipo no protocolo são amarrados a ele pelo
 * compilador: `satisfies` impede um valor fora do tipo, e o `Uncovered*` exportado
 * logo abaixo impede que a tupla deixe de cobrir o tipo inteiro.
 */

import type {
	PersonaKey,
	Question,
	QuestionScope,
	ScaleQuestion,
} from "../protocol/types";

/**
 * Falha a compilação quando `T` não é `never`.
 *
 * Usado com `Exclude<Tipo, (typeof tupla)[number]>`: se o protocolo ganhar um valor
 * que a tupla não tem, o que sobra da subtração deixa de ser `never` e a restrição
 * não é satisfeita — o erro aparece aqui, e não numa linha do seed em produção.
 */
type AssertNever<T extends never> = T;

export const personaKeys = [
	"COLLECTOR",
	"RECYCLING_COMPANY",
	"GENERAL_COMPANY",
	"CITIZEN",
	"GOVERNMENT",
] as const satisfies readonly PersonaKey[];

export type UncoveredPersonaKey = AssertNever<
	Exclude<PersonaKey, (typeof personaKeys)[number]>
>;

export const sessionStatuses = [
	"IN_PROGRESS",
	"COMPLETED",
	"ABANDONED",
	"DISCARDED",
] as const;

export const outcomes = ["YES", "PARTIAL", "NO"] as const;

export const questionScopes = [
	"SCREENER",
	"PER_SUITE",
	"FINAL",
] as const satisfies readonly QuestionScope[];

export type UncoveredQuestionScope = AssertNever<
	Exclude<QuestionScope, (typeof questionScopes)[number]>
>;

export const questionTypes = [
	"SCALE",
	"CHOICE",
	"TEXT",
	"LOCATION",
] as const satisfies readonly Question["type"][];

export type UncoveredQuestionType = AssertNever<
	Exclude<Question["type"], (typeof questionTypes)[number]>
>;

export const polarities = [
	"POSITIVE",
	"NEGATIVE",
] as const satisfies readonly NonNullable<ScaleQuestion["polarity"]>[];

export type UncoveredPolarity = AssertNever<
	Exclude<NonNullable<ScaleQuestion["polarity"]>, (typeof polarities)[number]>
>;

export const screenSizes = ["SMALL", "MEDIUM", "LARGE"] as const;

export const ageRanges = [
	"UNDER_18",
	"AGE_18_24",
	"AGE_25_34",
	"AGE_35_44",
	"AGE_45_54",
	"AGE_55_64",
	"OVER_64",
] as const;

export const educationLevels = [
	"NONE",
	"ELEMENTARY_INCOMPLETE",
	"ELEMENTARY_COMPLETE",
	"HIGHSCHOOL_INCOMPLETE",
	"HIGHSCHOOL_COMPLETE",
	"HIGHER_INCOMPLETE",
	"HIGHER_COMPLETE",
	"POSTGRADUATE",
] as const;

/**
 * Papel na cadeia, separado de `persona` de propósito: a persona é autodeclarada e
 * define o roteiro, enquanto o papel descreve a atividade real. Divergência entre os
 * dois é verificação de qualidade da amostra num recrutamento aberto.
 */
export const chainRoles = [
	"INDEPENDENT_COLLECTOR",
	"COOPERATIVE_MEMBER",
	"RECYCLING_BUSINESS",
	"GENERAL_BUSINESS",
	"PUBLIC_SERVANT",
	"RESEARCHER",
	"NONE",
	"OTHER",
] as const;
