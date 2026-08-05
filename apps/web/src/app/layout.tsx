import type { Metadata } from "next";
import { Raleway, Roboto_Slab } from "next/font/google";

import "../index.css";
import { cn } from "@survey/ui/lib/utils";
import { ChartIconProvider } from "@/components/chart-icon-provider";
import Header from "@/components/header";
import Providers from "@/components/providers";

const raleway = Raleway({
	variable: "--font-sans",
	subsets: ["latin"],
});

const robotoSlab = Roboto_Slab({
	variable: "--font-heading",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Oikos Survey",
	description: "Pesquisa de usabilidade do Oikos",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={cn("font-sans", raleway.variable, robotoSlab.variable)}
		>
			<body className="antialiased">
				<ChartIconProvider>
					<Providers>
						<div className="grid h-svh grid-rows-[auto_1fr]">
							<Header />
							{children}
						</div>
					</Providers>
				</ChartIconProvider>
			</body>
		</html>
	);
}
