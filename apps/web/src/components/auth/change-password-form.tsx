"use client";

import { Button } from "@survey/ui/components/button";
import { Input } from "@survey/ui/components/input";
import { Label } from "@survey/ui/components/label";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		// `revokeOtherSessions` derruba toda sessão existente — inclusive a que fez esta
		// chamada — e o Better Auth já devolve um cookie de sessão novo na resposta (S10
		// AC: trocar a senha invalida a sessão anterior).
		const { error: changeError } = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});

		setSubmitting(false);

		if (changeError) {
			setError(changeError.message ?? "Não foi possível trocar a senha.");
			return;
		}

		setCurrentPassword("");
		setNewPassword("");
		toast.success("Senha alterada.");
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="current-password">Senha atual</Label>
				<Input
					id="current-password"
					type="password"
					autoComplete="current-password"
					required
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="new-password">Nova senha</Label>
				<Input
					id="new-password"
					type="password"
					autoComplete="new-password"
					required
					minLength={8}
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
				/>
			</div>
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
			<Button type="submit" disabled={submitting} className="self-start">
				{submitting ? "Trocando…" : "Trocar senha"}
			</Button>
		</form>
	);
}
