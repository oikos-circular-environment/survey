import { type ScaleBand, ScaleBar } from "./scale-bar";

const BANDS: readonly ScaleBand[] = [
	{ label: "Péssimo", className: "bg-status-critical" },
	{ label: "Satisfatório", className: "bg-status-serious" },
	{ label: "Bom", className: "bg-status-warning" },
	{ label: "Ótimo", className: "bg-status-good" },
];

/**
 * Barra de classificação do Nível de Usabilidade — 4 faixas iguais (Péssimo
 * [0,0.25) · Satisfatório [0.25,0.5) · Bom [0.5,0.75) · Ótimo [0.75,1]), com um
 * marcador na posição do valor. Layout espelha o card "Nível de Usabilidade (Us)"
 * desenhado no Pencil (nó b7pAvu).
 */
export function UsabilityScaleBar({ value }: { value: number }) {
	return <ScaleBar bands={BANDS} fraction={value} />;
}
