const BANDS = ["#d03b3b", "#ec835a", "#fab219", "#a8c93a", "#0ca30c"];

/**
 * Barra segmentada de 5 pontos (Discordo totalmente → Concordo totalmente), com um
 * marcador na posição da média bruta. Espelha `pencil/scripts/likert-scale-bar.js` —
 * decisão desta sessão: heurísticas Likert são exibidas como posição na escala, nunca
 * como percentual isolado ("72,5% de quê?").
 */
export function LikertScale({ value }: { value: number }) {
	const clamped = Math.max(1, Math.min(5, value));
	const fraction = (clamped - 1) / 4;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="relative flex h-2.5 w-full overflow-hidden rounded-full">
				{BANDS.map((color, index) => (
					<div
						key={color}
						className="h-full flex-1"
						style={{
							backgroundColor: color,
							marginLeft: index > 0 ? 1 : 0,
						}}
					/>
				))}
				<div
					className="absolute top-[-3px] h-[16px] w-1 rounded-full bg-foreground"
					style={{ left: `calc(${fraction * 100}% - 2px)` }}
				/>
			</div>
			<div className="flex justify-between text-[11px] text-muted-foreground">
				<span>Discordo totalmente</span>
				<span>Concordo totalmente</span>
			</div>
		</div>
	);
}
