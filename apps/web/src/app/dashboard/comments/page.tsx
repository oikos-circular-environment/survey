"use client";

import { Card, CardContent, CardHeader } from "@survey/ui/components/card";
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

function participantCodeLabel(participantCode: string): string {
	return `PSQ-${participantCode}`;
}

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
					{comments.data?.map((comment) => (
						<Card key={comment.participantCode}>
							<CardHeader className="flex flex-row items-center justify-between">
								<span className="font-semibold text-sm">{comment.persona}</span>
								<span className="text-muted-foreground text-xs">
									{participantCodeLabel(comment.participantCode)}
								</span>
							</CardHeader>
							<CardContent className="text-sm">“{comment.comment}”</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
