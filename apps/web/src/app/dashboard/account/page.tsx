import { auth } from "@oikos-circular-environment/survey-db/auth/index";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { headers } from "next/headers";

import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function AccountPage() {
	// `proxy.ts` já garante sessão de admin válida para chegar aqui — só precisamos do
	// e-mail para exibir.
	const session = await auth.api.getSession({ headers: await headers() });

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-heading font-semibold text-2xl">Conta</h1>
				{session ? (
					<p className="text-muted-foreground text-sm">{session.user.email}</p>
				) : null}
			</div>

			<Card className="max-w-sm">
				<CardHeader>
					<CardTitle>Trocar senha</CardTitle>
					<CardDescription>
						Invalida a sessão atual e cria uma nova.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChangePasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
