"use client";

import { Card, CardContent } from "@survey/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyTitle,
} from "@survey/ui/components/empty";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

export default function CommentsPage() {
	const { range } = useDateRange();
	const comments = useQuery(
		trpc.dashboard.comments.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Comentários livres"
				description="Sem agregação — o único dado textual do instrumento"
			/>

			{comments.data && comments.data.length === 0 ? (
				<Empty>
					<MessageSquareText className="size-8 text-muted-foreground" />
					<EmptyTitle>Nenhum comentário no período</EmptyTitle>
					<EmptyDescription>
						Ajuste o filtro de período para ver comentários de outras datas.
					</EmptyDescription>
				</Empty>
			) : (
				<div className="flex flex-col gap-3">
					{comments.data?.map((comment, index) => (
						<Card key={`${index}-${comment.slice(0, 24)}`}>
							<CardContent className="pt-4 text-sm">{comment}</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
