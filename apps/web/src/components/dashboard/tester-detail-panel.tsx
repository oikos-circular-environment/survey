import type { TesterDetail } from "@oikos-circular-environment/survey-api/use-cases/get-tester-detail";
import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent, CardHeader } from "@survey/ui/components/card";

import { TesterStatusBadge } from "./tester-status-badge";

function formatDateTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) {
		return `${hours}h${String(minutes).padStart(2, "0")}m`;
	}
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function participantCodeLabel(participantCode: string): string {
	return `PSQ-${participantCode}`;
}

const OUTCOME_LABELS: Record<string, string> = {
	YES: "Concluída",
	PARTIAL: "Parcial",
	NO: "Não concluída",
};

function InfoField({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-muted p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium text-sm">{value}</p>
		</div>
	);
}

/**
 * Painel de detalhe de um testador — abre ao selecionar uma linha no gerenciamento de
 * testadores. Mostra tudo que a sessão guarda (screener, aparelho, tempos, execução
 * por suíte, comentário livre), sem nenhum dado identificável — o schema já garante
 * isso, ver `schema/collection.ts`.
 */
export function TesterDetailPanel({ tester }: { tester: TesterDetail }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex flex-col gap-1">
					<h3 className="font-semibold text-base">
						{tester.persona} · {participantCodeLabel(tester.participantCode)}
					</h3>
					<p className="text-muted-foreground text-xs">
						{tester.cityName} / {tester.stateUf}
					</p>
				</div>
				<TesterStatusBadge status={tester.status} />
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<div>
					<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						Screener
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						<InfoField label="Faixa etária" value={tester.ageRange} />
						<InfoField label="Escolaridade" value={tester.educationLevel} />
						<InfoField label="Papel na cadeia" value={tester.chainRole} />
						<InfoField
							label="Relação com resíduos"
							value={tester.wasteContactFrequency}
						/>
						<InfoField
							label="Experiência com apps"
							value={tester.appExperience}
						/>
					</div>
				</div>

				<div>
					<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						Aparelho e consentimento
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<InfoField
							label="Sistema"
							value={`${tester.deviceOs} ${tester.deviceOsVersion}`}
						/>
						<InfoField label="Versão do app" value={tester.appVersion} />
						<InfoField label="Tamanho de tela" value={tester.screenSize} />
						<InfoField
							label="Consentimento"
							value={`v${tester.consentVersion} · ${formatDateTime(tester.consentAt)}`}
						/>
					</div>
				</div>

				<div>
					<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						Sessão
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<InfoField
							label="Início"
							value={formatDateTime(tester.startedAt)}
						/>
						<InfoField label="Fim" value={formatDateTime(tester.finishedAt)} />
						<InfoField
							label="Tempo ativo"
							value={formatDuration(tester.activeMs)}
						/>
						<InfoField
							label="Tempo total"
							value={formatDuration(tester.wallMs)}
						/>
					</div>
					{tester.abandonReason ? (
						<p className="mt-2 text-muted-foreground text-xs">
							Motivo do abandono: {tester.abandonReason}
						</p>
					) : null}
				</div>

				{tester.suiteRuns.length > 0 ? (
					<div>
						<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
							Execução por suíte
						</p>
						<div className="flex flex-col gap-2">
							{tester.suiteRuns.map((run) => (
								<div
									key={run.suiteCode}
									className="flex items-center justify-between gap-3 bg-muted p-3"
								>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{run.suiteCode}</Badge>
										<span className="text-sm">{run.suiteTitle}</span>
									</div>
									<div className="flex items-center gap-3 text-muted-foreground text-xs">
										<span>{formatDuration(run.activeMs)}</span>
										<Badge variant="secondary">
											{run.outcome ? OUTCOME_LABELS[run.outcome] : "—"}
										</Badge>
									</div>
								</div>
							))}
						</div>
					</div>
				) : null}

				{tester.freeComment ? (
					<div>
						<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
							Comentário livre
						</p>
						<p className="text-sm">“{tester.freeComment}”</p>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
