import { type ScaleBand, ScaleBar } from "./scale-bar";

const BANDS: readonly ScaleBand[] = [
	{ label: "Discordo totalmente", className: "bg-status-critical" },
	{ label: "Discordo", className: "bg-status-serious" },
	{ label: "Neutro", className: "bg-status-warning" },
	{ label: "Concordo", className: "bg-status-fair" },
	{ label: "Concordo totalmente", className: "bg-status-good" },
];

/**
 * Barra segmentada de 5 pontos da escala de concordância (`agreementOptions` do
 * protocolo), com um marcador na posição da média bruta. Decisão do projeto:
 * heurísticas Likert são exibidas como posição na escala, nunca como percentual
 * isolado ("72,5% de quê?").
 */
export function LikertScale({ value }: { value: number }) {
	const clamped = Math.max(1, Math.min(5, value));

	return <ScaleBar bands={BANDS} fraction={(clamped - 1) / 4} />;
}
