import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ redirect?: string }>;
}) {
	const { redirect } = await searchParams;

	return (
		<div className="flex min-h-svh items-center justify-center p-6">
			<LoginForm redirectTo={redirect} />
		</div>
	);
}
