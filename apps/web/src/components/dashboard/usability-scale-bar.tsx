const BANDS = [
	{ label: "Péssimo", className: "bg-status-critical" },
	{ label: "Satisfatório", className: "bg-status-serious" },
	{ label: "Bom", className: "bg-status-warning" },
	{ label: "Ótimo", className: "bg-status-good" },
] as const;

/**
 * Barra de classificação do Nível de Usabilidade — 4 faixas iguais (Péssimo
 * [0,0.25) · Satisfatório [0.25,0.5) · Bom [0.5,0.75) · Ótimo [0.75,1]), com um
 * marcador na posição do valor. Layout espelha o card "Nível de Usabilidade (Us)"
 * desenhado no Pencil (nó b7pAvu), mas com cantos quadrados — não arredondados como no
 * mockup — seguindo a convenção `rounded-none` já usada em todo o design system
 * base-lyra (badge, card, progress).
 */
export function UsabilityScaleBar({ value }: { value: number }) {
	const clamped = Math.max(0, Math.min(1, value));

	return (
		<div className="flex flex-col gap-1.5">
			<div className="relative flex h-3 w-full gap-0.5">
				{BANDS.map((band) => (
					<div key={band.label} className={`h-full flex-1 ${band.className}`} />
				))}
				<div
					className="absolute top-[-3px] h-[calc(100%+6px)] w-1 bg-foreground"
					style={{ left: `calc(${clamped * 100}% - 2px)` }}
				/>
			</div>
			<div className="grid grid-cols-4 text-muted-foreground text-xs">
				{BANDS.map((band, index) => (
					<span
						key={band.label}
						className={
							index === 0
								? "text-left"
								: index === BANDS.length - 1
									? "text-right"
									: "text-center"
						}
					>
						{band.label}
					</span>
				))}
			</div>
		</div>
	);
}
