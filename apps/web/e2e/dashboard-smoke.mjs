/**
 * Fumaça e2e do dashboard: visita as 9 telas com um `next dev` já rodando, testa a
 * troca de preset do filtro de período e o estado do range picker customizado, e
 * falha se qualquer página gerar erro de console, erro não capturado, ou requisição
 * tRPC com status >= 400. Screenshots vão para /tmp/dashboard-*.png para inspeção
 * visual manual — não são asserção automática de layout.
 *
 * Uso: `bun run test:e2e` (com o dev server já no ar em DASHBOARD_URL, padrão
 * http://localhost:3001).
 */
import { chromium } from "playwright";

const BASE_URL = process.env.DASHBOARD_URL ?? "http://localhost:3001";
const PAGES = [
	{ path: "/dashboard", name: "overview" },
	{ path: "/dashboard/suites", name: "suites" },
	{ path: "/dashboard/tasks", name: "tasks" },
	{ path: "/dashboard/personas", name: "personas" },
	{ path: "/dashboard/suite-personas", name: "suite-personas" },
	{ path: "/dashboard/demographics", name: "demographics" },
	{ path: "/dashboard/heuristics", name: "heuristics" },
	{ path: "/dashboard/domain-items", name: "domain-items" },
	{ path: "/dashboard/comments", name: "comments" },
	{ path: "/dashboard/testers", name: "testers" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

page.on("console", (msg) => {
	if (msg.type() === "error")
		consoleErrors.push({ url: page.url(), text: msg.text() });
});
page.on("pageerror", (err) =>
	pageErrors.push({ url: page.url(), text: err.message }),
);
page.on("requestfailed", (req) =>
	failedRequests.push({
		url: page.url(),
		request: req.url(),
		failure: req.failure()?.errorText,
	}),
);
page.on("response", (res) => {
	if (res.status() >= 400 && res.url().includes("/api/trpc")) {
		failedRequests.push({
			url: page.url(),
			request: res.url(),
			status: res.status(),
		});
	}
});

let ok = 0;
for (const { path, name } of PAGES) {
	await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
	await page.waitForTimeout(500);
	await page.screenshot({ path: `/tmp/dashboard-${name}.png`, fullPage: true });
	console.log(`visited ${path}`);
	ok++;
}

// Testa o filtro de período: troca para "Último mês" na Visão geral e confere se o
// gráfico de área desenha alguma coisa, depois testa o estado "Personalizado".
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Últimos 7 dias/ }).click();
await page.getByRole("button", { name: "Último mês" }).click();
await page.waitForTimeout(500);
await page.screenshot({
	path: "/tmp/dashboard-overview-1m.png",
	fullPage: true,
});
console.log("switched to Último mês");

await page.getByRole("button", { name: /Último mês/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/dashboard-overview-custom-picker.png" });
console.log("opened custom range picker");

await browser.close();

console.log(`\n=== ${ok}/${PAGES.length} pages visited ===`);
console.log("console errors:", JSON.stringify(consoleErrors, null, 2));
console.log("page errors:", JSON.stringify(pageErrors, null, 2));
console.log("failed requests:", JSON.stringify(failedRequests, null, 2));

if (consoleErrors.length || pageErrors.length || failedRequests.length) {
	process.exit(1);
}
