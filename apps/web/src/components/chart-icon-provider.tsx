"use client";

import type { LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHART_ICONS } from "@/lib/chart-icons";

const ROTATE_INTERVAL_MS = 5000;
const FALLBACK_PRIMARY_COLOR = "#f5c344";
const FALLBACK_CARD_COLOR_LIGHT = "#0a0a0a";
const FALLBACK_CARD_COLOR_DARK = "#3a3a3a";

const ChartIconContext = createContext<LucideIcon>(CHART_ICONS[0]);

function pickNextIndex(previousIndex: number): number {
	if (CHART_ICONS.length <= 1) return 0;
	let next = previousIndex;
	while (next === previousIndex) {
		next = Math.floor(Math.random() * CHART_ICONS.length);
	}
	return next;
}

/**
 * Gera o favicon na hora, lendo `--primary` e o fundo do card computados ao
 * vivo (segue o tema claro/escuro sem precisar duplicar a paleta aqui) — no
 * escuro o card usa `--muted` em vez do preto fixo, senão ele se perde contra
 * o fundo da página, que já é bem escuro. Os fallbacks hex só entram em cena
 * se a leitura do CSS falhar.
 */
function updateFavicon(Icon: LucideIcon) {
	const style = getComputedStyle(document.documentElement);
	const isDark = document.documentElement.classList.contains("dark");

	const primary =
		style.getPropertyValue("--primary").trim() || FALLBACK_PRIMARY_COLOR;
	const cardBackground = isDark
		? style.getPropertyValue("--muted").trim() || FALLBACK_CARD_COLOR_DARK
		: FALLBACK_CARD_COLOR_LIGHT;

	const svg = renderToStaticMarkup(
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img">
			<title>Survey</title>
			<rect width={32} height={32} rx={7} fill={cardBackground} />
			<g transform="translate(6 6)">
				<Icon color={primary} size={20} strokeWidth={2.25} />
			</g>
		</svg>,
	);

	let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (!link) {
		link = document.createElement("link");
		link.rel = "icon";
		document.head.appendChild(link);
	}
	link.type = "image/svg+xml";
	link.href = `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function ChartIconProvider({ children }: { children: React.ReactNode }) {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;

		function start() {
			if (intervalId) return;
			intervalId = setInterval(() => {
				setIndex((previous) => pickNextIndex(previous));
			}, ROTATE_INTERVAL_MS);
		}

		function stop() {
			if (!intervalId) return;
			clearInterval(intervalId);
			intervalId = undefined;
		}

		function handleVisibilityChange() {
			if (document.hidden) stop();
			else start();
		}

		if (!document.hidden) start();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			stop();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	useEffect(() => {
		updateFavicon(CHART_ICONS[index]);
	}, [index]);

	return (
		<ChartIconContext.Provider value={CHART_ICONS[index]}>
			{children}
		</ChartIconContext.Provider>
	);
}

export function useChartIcon(): LucideIcon {
	return useContext(ChartIconContext);
}
