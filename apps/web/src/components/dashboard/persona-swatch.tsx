import { PERSONA_COLORS } from "./persona-labels";

/**
 * Ponto colorido + rótulo — identifica visualmente a persona com a mesma cor fixa
 * usada no gráfico de sessões da Visão geral (`PERSONA_COLORS`), para que a cor de
 * cada persona seja consistente em toda a aplicação, não só no gráfico.
 */
export function PersonaSwatch({
	personaKey,
	label,
}: {
	personaKey: string;
	label: string;
}) {
	return (
		<span className="inline-flex items-center gap-2">
			<span
				className="size-2.5 shrink-0"
				style={{
					backgroundColor:
						PERSONA_COLORS[personaKey] ?? "var(--muted-foreground)",
				}}
			/>
			{label}
		</span>
	);
}
