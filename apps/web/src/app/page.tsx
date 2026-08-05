"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { trpc } from "@/utils/trpc";

const TITLE_TEXT = `
███████╗██╗   ██╗██████╗ ██╗   ██╗███████╗██╗   ██╗
██╔════╝██║   ██║██╔══██╗██║   ██║██╔════╝╚██╗ ██╔╝
███████╗██║   ██║██████╔╝██║   ██║█████╗   ╚████╔╝
╚════██║██║   ██║██╔══██╗╚██╗ ██╔╝██╔══╝    ╚██╔╝
███████║╚██████╔╝██║  ██║ ╚████╔╝ ███████╗   ██║
╚══════╝ ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝   ╚═╝
 `;

export default function Home() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());

	return (
		<div className="container mx-auto max-w-7xl px-4 py-2">
			<pre className="overflow-x-auto text-center font-mono text-sm">
				{TITLE_TEXT}
			</pre>
			<div className="grid gap-6 sm:grid-cols-2">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</span>
					</div>
				</section>
				<Link
					href="/dashboard"
					className="rounded-lg border p-4 transition-colors hover:bg-accent"
				>
					<h2 className="mb-2 font-medium">Dashboard</h2>
					<span className="text-muted-foreground text-sm">
						Ver métricas de usabilidade
					</span>
				</Link>
			</div>
		</div>
	);
}
