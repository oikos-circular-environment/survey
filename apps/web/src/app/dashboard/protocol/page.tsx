"use client";

import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent } from "@survey/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@survey/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@survey/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { trpc } from "@/utils/trpc";

type SuccessSignal = {
	kind: string;
	method?: string;
	path_pattern?: string;
	status?: number;
	route?: string;
	name?: string;
};

function signalSummary(signal: SuccessSignal): string {
	if (signal.kind === "api") {
		return `${signal.method} ${signal.path_pattern} → ${signal.status}`;
	}
	if (signal.kind === "screen") return signal.route ?? "";
	return signal.name ?? "";
}

const SCOPE_LABELS: Record<string, string> = {
	SCREENER: "Caracterização",
	PER_SUITE: "Pós-etapa",
	FINAL: "Fim de sessão",
};

export default function ProtocolPage() {
	const [versionId, setVersionId] = useState<string | null>(null);

	const versions = useQuery(
		trpc.dashboard.protocolVersions.list.queryOptions(),
	);
	const protocol = useQuery(
		trpc.dashboard.protocol.queryOptions({
			protocolVersionId: versionId ?? undefined,
		}),
	);

	const versionItems = useMemo(() => {
		const entries: Record<string, string> = {};
		for (const version of versions.data ?? []) {
			entries[version.id] =
				`${version.key} · v${version.version}${version.isActive ? " (ativa)" : ""}`;
		}
		return entries;
	}, [versions.data]);

	const data = protocol.data;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading font-semibold text-2xl">Protocolo</h1>
					<p className="text-muted-foreground text-sm">
						Definição do instrumento: suítes, tarefas, questões e personas.
						Sessões antigas executaram versões anteriores — os códigos de tarefa
						foram renumerados entre versões, então escolha a versão que a sessão
						analisada usou.
					</p>
				</div>

				{Object.keys(versionItems).length > 0 ? (
					<Select
						items={versionItems}
						value={versionId ?? ""}
						onValueChange={(value) => setVersionId((value as string) || null)}
					>
						<SelectTrigger className="min-w-56">
							<SelectValue>
								{data ? `${data.key} · v${data.version}` : "Versão ativa"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(versions.data ?? []).map((version) => (
								<SelectItem key={version.id} value={version.id}>
									{version.key} · v{version.version}
									{version.isActive ? " (ativa)" : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
			</div>

			{protocol.isLoading ? (
				<p className="text-muted-foreground text-sm">Carregando…</p>
			) : !data ? (
				<p className="text-muted-foreground text-sm">
					Nenhuma versão ativa. Ligue uma em “Versões do protocolo” ou escolha
					uma versão acima.
				</p>
			) : (
				<Tabs defaultValue="suites">
					<TabsList>
						<TabsTrigger value="suites">
							Suítes ({data.suites.length})
						</TabsTrigger>
						<TabsTrigger value="tasks">
							Tarefas ({data.tasks.length})
						</TabsTrigger>
						<TabsTrigger value="questions">
							Questões ({data.questions.length})
						</TabsTrigger>
						<TabsTrigger value="personas">
							Personas ({data.personas.length})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="suites">
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-16">Código</TableHead>
											<TableHead>Título</TableHead>
											<TableHead>Objetivo</TableHead>
											<TableHead>Tarefas</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.suites.map((suite) => (
											<TableRow key={suite.code}>
												<TableCell>
													<Badge variant="outline">{suite.code}</Badge>
												</TableCell>
												<TableCell className="font-medium">
													{suite.title}
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{suite.objective}
												</TableCell>
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{suite.task_codes.map((code) => (
															<Badge key={code} variant="secondary">
																{code}
															</Badge>
														))}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tasks">
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-16">Código</TableHead>
											<TableHead>Título</TableHead>
											<TableHead>Instrução</TableHead>
											<TableHead>Conclusão</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.tasks.map((task) => (
											<TableRow key={task.code}>
												<TableCell>
													<Badge variant="outline">{task.code}</Badge>
												</TableCell>
												<TableCell className="font-medium">
													{task.title}
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{task.instruction}
												</TableCell>
												<TableCell>
													<div className="flex flex-col gap-1">
														<span className="text-[11px] text-muted-foreground uppercase">
															{task.success.mode === "all"
																? "todos os sinais"
																: "qualquer sinal"}
														</span>
														{(task.success.signals as SuccessSignal[]).map(
															(signal) => (
																<div
																	key={signalSummary(signal)}
																	className="flex items-center gap-2"
																>
																	<Badge variant="secondary">
																		{signal.kind}
																	</Badge>
																	<code className="text-xs">
																		{signalSummary(signal)}
																	</code>
																</div>
															),
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="questions">
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Chave</TableHead>
											<TableHead>Escopo</TableHead>
											<TableHead>Tipo</TableHead>
											<TableHead>Enunciado</TableHead>
											<TableHead>Opções</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.questions.map((question) => (
											<TableRow key={question.key}>
												<TableCell>
													<code className="text-xs">{question.key}</code>
												</TableCell>
												<TableCell>
													<Badge variant="outline">
														{SCOPE_LABELS[question.scope] ?? question.scope}
													</Badge>
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{question.type}
												</TableCell>
												<TableCell className="max-w-md">
													<p className="text-sm">{question.label}</p>
													{question.depends_on ? (
														<p className="mt-1 text-[11px] text-muted-foreground">
															exibida se {question.depends_on.question_key} ={" "}
															{question.depends_on.equals}
														</p>
													) : null}
												</TableCell>
												<TableCell className="text-muted-foreground text-xs">
													{question.options
														?.map(
															(option) => `${option.value}. ${option.label}`,
														)
														.join(" · ") ?? "—"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="personas">
						<div className="flex flex-col gap-3">
							{data.personas.map((persona) => (
								<Card key={persona.key}>
									<CardContent className="flex flex-col gap-3 p-4">
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-2">
												<Badge variant="outline">{persona.key}</Badge>
												<span className="font-medium">{persona.label}</span>
											</div>
											<p className="text-muted-foreground text-sm">
												{persona.description}
											</p>
										</div>
										<div className="flex flex-col gap-2">
											{persona.suites.map((suite) => (
												<div key={suite.suite_code} className="bg-muted p-3">
													<Badge variant="secondary">{suite.suite_code}</Badge>
													<ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
														{suite.specific_objectives.map((objective) => (
															<li key={objective} className="text-sm">
																{objective}
															</li>
														))}
													</ul>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
