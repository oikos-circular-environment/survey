"use client";

import { SidebarMenuButton } from "@survey/ui/components/sidebar";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
	const router = useRouter();

	async function handleLogout() {
		await authClient.signOut();
		router.push("/login");
	}

	return (
		<SidebarMenuButton onClick={handleLogout}>
			<LogOut className="size-4" />
			<span>Sair</span>
		</SidebarMenuButton>
	);
}
