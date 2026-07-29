"use client";

import { Button } from "@survey/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { Input } from "@survey/ui/components/input";
import { Label } from "@survey/ui/components/label";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Mensagem única para toda falha de credencial (S10 AC): não diferencia "e-mail não
 * existe" de "senha errada" — o Better Auth já devolve o mesmo código
 * (`INVALID_EMAIL_OR_PASSWORD`) para os dois casos, e a tela não tenta ser mais
 * específica que o servidor.
 */
const GENERIC_ERROR = "E-mail ou senha inválidos.";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		const { error: signInError } = await authClient.signIn.email({
			email,
			password,
		});

		setSubmitting(false);

		if (signInError) {
			setError(GENERIC_ERROR);
			return;
		}

		router.push(safeRedirectTarget(redirectTo));
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Entrar</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="email">E-mail</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="password">Senha</Label>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</div>
					{error ? <p className="text-destructive text-xs">{error}</p> : null}
					<Button type="submit" disabled={submitting}>
						{submitting ? "Entrando…" : "Entrar"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

/**
 * Só redireciona para caminho relativo dentro do próprio app (S10 AC: cair na rota
 * pretendida após o login) — `//host/...` ou uma URL absoluta em `redirectTo` seria
 * open redirect, então qualquer coisa fora do formato `/algo` cai no painel.
 */
export function safeRedirectTarget(redirectTo: string | undefined): Route {
	if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
		return redirectTo as Route;
	}
	return "/dashboard";
}
