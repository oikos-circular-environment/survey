import { cn } from "@survey/ui/lib/utils";

export interface ScaleBand {
	label: string;
	className: string;
}

/**
 * Base das barras de escala do painel (Nível de Usabilidade e Likert 1–5): faixas de
 * largura igual, marcador transbordando a barra na posição do valor e legenda com uma
 * label por faixa. Cantos quadrados seguindo a convenção `rounded-none` do design system
 * base-lyra (badge, card, progress).
 *
 * `fraction` é a posição normalizada em [0,1] — cada escala converte seu domínio antes
 * de chamar, então a barra não conhece nem a escala 1–5 nem a de usabilidade.
 */
export function ScaleBar({
	bands,
	fraction,
}: {
	bands: readonly ScaleBand[];
	fraction: number;
}) {
	const clamped = Math.max(0, Math.min(1, fraction));

	return (
		<div className="flex flex-col gap-1.5">
			<div className="relative flex h-3 w-full gap-0.5">
				{bands.map((band) => (
					<div
						key={band.label}
						className={cn("h-full flex-1", band.className)}
					/>
				))}
				<div
					className="absolute top-[-3px] h-[calc(100%+6px)] w-1 bg-foreground"
					style={{ left: `calc(${clamped * 100}% - 2px)` }}
				/>
			</div>
			<div className="flex text-[11px] text-muted-foreground leading-tight">
				{bands.map((band, index) => (
					<span
						key={band.label}
						className={cn(
							"flex-1 px-0.5",
							index === 0
								? "text-left"
								: index === bands.length - 1
									? "text-right"
									: "text-center",
						)}
					>
						{band.label}
					</span>
				))}
			</div>
		</div>
	);
}
