"use client";

import { Card, CardContent } from "@survey/ui/components/card";
import { Switch } from "@survey/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

function formatPublishedAt(ms: number): string {
	return new Date(ms).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ProtocolVersionsPage() {
	const queryClient = useQueryClient();
	const listQuery = trpc.dashboard.protocolVersions.list.queryOptions();
	const versions = useQuery(listQuery);

	const setActive = useMutation(
		trpc.dashboard.protocolVersions.setActive.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: listQuery.queryKey }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const latestVersionByKey = new Map<string, number>();
	for (const version of versions.data ?? []) {
		const current = latestVersionByKey.get(version.key);
		if (current === undefined || version.version > current) {
			latestVersionByKey.set(version.key, version.version);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-heading font-semibold text-2xl">
					Versões do protocolo
				</h1>
				<p className="text-muted-foreground text-sm">
					Liga ou desliga a última versão de cada chave para novos
					participantes. Desligá-la esconde o convite no aplicativo; sessões já
					em andamento não são afetadas. Versões substituídas não voltam a
					circular. Publicar uma versão nova a entrega automaticamente.
				</p>
			</div>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Chave</TableHead>
								<TableHead>Versão</TableHead>
								<TableHead>Publicada em</TableHead>
								<TableHead className="text-right">Ativa</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(versions.data ?? []).map((version) => {
								const isLatest =
									latestVersionByKey.get(version.key) === version.version;
								return (
									<TableRow key={version.id}>
										<TableCell>{version.key}</TableCell>
										<TableCell>{version.version}</TableCell>
										<TableCell>
											{formatPublishedAt(version.publishedAt)}
										</TableCell>
										<TableCell className="text-right">
											<span className="flex items-center justify-end gap-2">
												{isLatest ? null : (
													<span className="text-muted-foreground text-xs">
														substituída
													</span>
												)}
												<Switch
													checked={version.isActive}
													disabled={setActive.isPending || !isLatest}
													onCheckedChange={(checked) =>
														setActive.mutate({
															id: version.id,
															isActive: checked,
														})
													}
												/>
											</span>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
