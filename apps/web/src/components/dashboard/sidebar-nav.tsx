"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@survey/ui/components/sidebar";
import {
	ClipboardList,
	KeyRound,
	LayoutDashboard,
	ListChecks,
	MessageSquareText,
	Sparkles,
	Table2,
	ToggleLeft,
	UserCog,
	UsersRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";

const OVERVIEW_ITEMS = [
	{ href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
];

const RESULTS_ITEMS = [
	{ href: "/dashboard/suites", label: "Por suíte", icon: Table2 },
	{ href: "/dashboard/tasks", label: "Por tarefa", icon: ListChecks },
	{ href: "/dashboard/personas", label: "Por persona", icon: UsersRound },
	{
		href: "/dashboard/suite-personas",
		label: "Suíte → personas",
		icon: UsersRound,
	},
];

const MANAGEMENT_ITEMS = [
	{ href: "/dashboard/testers", label: "Testadores", icon: UserCog },
	{
		href: "/dashboard/protocol-versions",
		label: "Versões do protocolo",
		icon: ToggleLeft,
	},
];

const ACCOUNT_ITEMS = [
	{ href: "/dashboard/account", label: "Conta", icon: KeyRound },
];

const QUALITY_ITEMS = [
	{
		href: "/dashboard/demographics",
		label: "Caracterização",
		icon: ClipboardList,
	},
	{ href: "/dashboard/heuristics", label: "Heurísticas", icon: Sparkles },
	{
		href: "/dashboard/domain-items",
		label: "Itens de domínio",
		icon: ClipboardList,
	},
	{
		href: "/dashboard/comments",
		label: "Comentários",
		icon: MessageSquareText,
	},
];

function NavGroup({
	label,
	items,
}: {
	label?: string;
	items: Array<{
		href: string;
		label: string;
		icon: React.ComponentType<{ className?: string }>;
	}>;
}) {
	const pathname = usePathname();
	return (
		<SidebarGroup>
			{label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.href}>
							<SidebarMenuButton
								render={<Link href={item.href as Route} />}
								isActive={pathname === item.href}
							>
								<item.icon className="size-4" />
								<span>{item.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export function DashboardSidebar() {
	return (
		<Sidebar>
			<SidebarHeader className="px-4 py-3">
				<span className="font-heading font-semibold text-sm">
					Oikos — Métricas
				</span>
				<span className="text-muted-foreground text-xs">
					Pesquisa de usabilidade
				</span>
			</SidebarHeader>
			<SidebarContent>
				<NavGroup items={OVERVIEW_ITEMS} />
				<NavGroup label="Resultados" items={RESULTS_ITEMS} />
				<NavGroup label="Gerenciamento" items={MANAGEMENT_ITEMS} />
				<NavGroup label="Qualidade" items={QUALITY_ITEMS} />
			</SidebarContent>
			<SidebarFooter>
				<NavGroup items={ACCOUNT_ITEMS} />
				<SidebarMenu>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
