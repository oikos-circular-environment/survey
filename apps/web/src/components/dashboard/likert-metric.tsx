import { LikertScale } from "./likert-scale";

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

/**
 * Bloco padrão para qualquer média de escala de concordância 1–5 do painel:
 * legenda → valor → barra. Heurísticas e itens de domínio expõem o mesmo formato de
 * dado (média bruta + n), então renderizam pelo mesmo componente.
 */
export function LikertMetric({
	caption,
	value,
}: {
	caption: string;
	value: number;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-muted-foreground text-xs">{caption}</span>
			<span className="font-semibold text-2xl">{formatRate(value)} / 5</span>
			<LikertScale value={value} />
		</div>
	);
}

export function pluralizeResponses(n: number): string {
	return `${n} ${n === 1 ? "resposta" : "respostas"}`;
}
