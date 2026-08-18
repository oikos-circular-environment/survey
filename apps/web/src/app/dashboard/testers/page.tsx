"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@survey/ui/components/alert-dialog";
import { Badge } from "@survey/ui/components/badge";
import { Button } from "@survey/ui/components/button";
import { Card, CardContent } from "@survey/ui/components/card";
import { Input } from "@survey/ui/components/input";
import { Skeleton } from "@survey/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@survey/ui/components/tabs";
import { cn } from "@survey/ui/lib/utils";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TesterDetailPanel } from "@/components/dashboard/tester-detail-panel";
import { TesterStatusBadge } from "@/components/dashboard/tester-status-badge";
import { trpc } from "@/utils/trpc";

const PAGE_SIZE = 10;

type StatusFilter = "active" | "deleted" | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
	{ value: "active", label: "Ativos" },
	{ value: "deleted", label: "Deletados" },
	{ value: "all", label: "Todos" },
];

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function participantCodeLabel(participantCode: string): string {
	return `PSQ-${participantCode}`;
}

const TABLE_COLUMN_COUNT = 10;

function TestersTableSkeleton() {
	return (
		<>
			{Array.from({ length: PAGE_SIZE }).map((_, index) => (
				<TableRow key={`skeleton-${index}`}>
					{Array.from({ length: TABLE_COLUMN_COUNT }).map((__, cellIndex) => (
						<TableCell key={`skeleton-cell-${cellIndex}`}>
							<Skeleton className="h-4 w-full" />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}

export default function TestersPage() {
	const { range } = useDateRange();
	const queryClient = useQueryClient();
	const [status, setStatus] = React.useState<StatusFilter>("active");
	const [page, setPage] = React.useState(1);
	const [codeSearch, setCodeSearch] = React.useState("");
	const [debouncedCodeSearch, setDebouncedCodeSearch] = React.useState("");
	const [selectedSessionId, setSelectedSessionId] = React.useState<
		string | null
	>(null);

	React.useEffect(() => {
		const timeout = setTimeout(() => setDebouncedCodeSearch(codeSearch), 300);
		return () => clearTimeout(timeout);
	}, [codeSearch]);

	const listQuery = trpc.dashboard.testers.list.queryOptions({
		from: range.from,
		to: range.to,
		status,
		page,
		pageSize: PAGE_SIZE,
		participantCode: debouncedCodeSearch || undefined,
	});
	const testers = useQuery({
		...listQuery,
		placeholderData: keepPreviousData,
	});

	const testerDetail = useQuery({
		...trpc.dashboard.testerDetail.queryOptions({
			sessionId: selectedSessionId ?? "",
		}),
		enabled: selectedSessionId !== null,
	});

	const deleteTester = useMutation(
		trpc.dashboard.testers.delete.mutationOptions({
			onSuccess: (_, variables) => {
				toast.success("Testador excluído.");
				queryClient.invalidateQueries({ queryKey: listQuery.queryKey });
				setSelectedSessionId((current) =>
					current === variables.sessionId ? null : current,
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	function handleStatusChange(value: StatusFilter) {
		setStatus(value);
		setPage(1);
	}

	function handleCodeSearchChange(value: string) {
		setCodeSearch(value);
		setPage(1);
	}

	const totalPages = testers.data
		? Math.max(1, Math.ceil(testers.data.total / PAGE_SIZE))
		: 1;

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Testadores"
				description="Uma linha por sessão. Selecione uma linha para ver todos os dados do testador — screener, aparelho e execução por suíte."
			/>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<Tabs
					value={status}
					onValueChange={(value) => handleStatusChange(value as StatusFilter)}
				>
					<TabsList>
						{STATUS_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

				<Input
					placeholder="Buscar por código (ex.: PSQ-01M0B68HECSH7KXHTHRJX1QR72)"
					value={codeSearch}
					onChange={(e) => handleCodeSearchChange(e.target.value)}
					className="w-full sm:w-80"
				/>
			</div>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Persona</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Início</TableHead>
								<TableHead>Cidade/UF</TableHead>
								<TableHead>Faixa etária</TableHead>
								<TableHead>Escolaridade</TableHead>
								<TableHead>Aparelho</TableHead>
								<TableHead className="text-right">Tempo ativo</TableHead>
								<TableHead className="text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{testers.isPending ? (
								<TestersTableSkeleton />
							) : (
								testers.data?.items.map((tester) => {
									const isDeleted = tester.deletedAt !== null;
									return (
										<TableRow
											key={tester.sessionId}
											onClick={() => {
												if (isDeleted) return;
												setSelectedSessionId((current) =>
													current === tester.sessionId
														? null
														: tester.sessionId,
												);
											}}
											className={cn(
												!isDeleted && "cursor-pointer",
												selectedSessionId === tester.sessionId && "bg-accent",
											)}
										>
											<TableCell>
												<Badge variant="outline">
													{participantCodeLabel(tester.participantCode)}
												</Badge>
											</TableCell>
											<TableCell className="font-medium">
												{tester.persona}
											</TableCell>
											<TableCell>
												<TesterStatusBadge status={tester.status} />
											</TableCell>
											<TableCell>{formatDate(tester.startedAt)}</TableCell>
											<TableCell>
												{tester.cityName} / {tester.stateUf}
											</TableCell>
											<TableCell>{tester.ageRange}</TableCell>
											<TableCell>{tester.educationLevel}</TableCell>
											<TableCell>{tester.deviceOs}</TableCell>
											<TableCell className="text-right">
												{formatDuration(tester.activeMs)}
											</TableCell>
											<TableCell className="text-right">
												{isDeleted ? (
													<span className="text-muted-foreground text-xs">
														Excluído em {formatDate(tester.deletedAt as string)}
													</span>
												) : (
													<AlertDialog>
														<AlertDialogTrigger
															render={
																<Button
																	variant="ghost"
																	size="icon-sm"
																	onClick={(e: React.MouseEvent) =>
																		e.stopPropagation()
																	}
																/>
															}
														>
															<Trash2 className="text-destructive" />
															<span className="sr-only">Excluir testador</span>
														</AlertDialogTrigger>
														<AlertDialogContent
															onClick={(e) => e.stopPropagation()}
														>
															<AlertDialogHeader>
																<AlertDialogTitle>
																	Excluir{" "}
																	{participantCodeLabel(tester.participantCode)}
																</AlertDialogTitle>
																<AlertDialogDescription>
																	Apaga a sessão e tudo vinculado a ela —
																	execuções, eventos e respostas. Não pode ser
																	desfeito.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancelar</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() =>
																		deleteTester.mutate({
																			sessionId: tester.sessionId,
																		})
																	}
																>
																	Excluir
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												)}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					Mostrando {testers.data ? (page - 1) * PAGE_SIZE + 1 : 0}–
					{testers.data ? Math.min(page * PAGE_SIZE, testers.data.total) : 0} de{" "}
					{testers.data?.total ?? 0}
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Anterior
					</Button>
					<span className="text-muted-foreground text-sm">
						{page} / {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					>
						Próximo
					</Button>
				</div>
			</div>

			{testerDetail.data ? (
				<TesterDetailPanel tester={testerDetail.data} />
			) : (
				<p className="text-muted-foreground text-sm">
					Selecione uma linha da tabela para ver todos os dados do testador.
				</p>
			)}
		</div>
	);
}
