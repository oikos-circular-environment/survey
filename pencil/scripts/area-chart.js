/**
 * @schema 2.11
 * @input days: number = 30
 * @input weights: string = "10,20,37,17,16"
 * @input colors: string = "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4"
 * @input strokeWidth: number = 1.5
 * @input gridLines: number = 4
 */
const days = Math.max(2, Math.floor(pencil.input.days));
const weights = pencil.input.weights.split(",").map(Number);
const colors = pencil.input.colors.split(",");
const w = pencil.width;
const h = pencil.height;

const total = [];
for (let i = 0; i < days; i++) {
	const v =
		6 +
		3.2 * Math.sin(i * 0.45) +
		1.8 * Math.sin(i * 1.1 + 1) +
		1.2 * Math.sin(i * 0.21 + 2);
	total.push(Math.max(1, v));
}

const series = weights.map((wgt) =>
	total.map((v) => Math.max(0, Math.round((v * wgt) / 100))),
);

const totals = new Array(days).fill(0);
for (const s of series) for (let i = 0; i < days; i++) totals[i] += s[i];
const max = Math.max(...totals, 1) * 1.15;
const stepX = days > 1 ? w / (days - 1) : 0;
const toY = (v) => h - (v / max) * h;

function smoothPath(points) {
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i - 1] || points[i];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2] || p2;
		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}
	return d;
}

const nodes = [];

const gridCount = Math.max(0, Math.floor(pencil.input.gridLines));
for (let g = 1; g <= gridCount; g++) {
	const y = (h / (gridCount + 1)) * g;
	nodes.push({
		type: "rectangle",
		name: `Grid ${g}`,
		x: 0,
		y,
		width: w,
		height: 1,
		fill: "#0000000f",
	});
}

const cumulative = new Array(days).fill(0);

series.forEach((values, s) => {
	const lowerPts = cumulative.map((v, i) => ({ x: i * stepX, y: toY(v) }));
	for (let i = 0; i < days; i++) cumulative[i] += values[i];
	const upperPts = cumulative.map((v, i) => ({ x: i * stepX, y: toY(v) }));

	let areaD = smoothPath(upperPts);
	areaD += ` L ${lowerPts[days - 1].x} ${lowerPts[days - 1].y}`;
	areaD += smoothPath([...lowerPts].reverse()).replace(/^M[^C]*/, " ");
	areaD += " Z";

	const lineD = smoothPath(upperPts);
	const color = colors[s % colors.length];

	nodes.push({
		type: "path",
		name: `Series ${s + 1} Fill`,
		x: 0,
		y: 0,
		width: w,
		height: h,
		geometry: areaD,
		viewBox: [0, 0, w, h],
		fill: `${color}b3`,
	});
	nodes.push({
		type: "path",
		name: `Series ${s + 1} Line`,
		x: 0,
		y: 0,
		width: w,
		height: h,
		geometry: lineD,
		viewBox: [0, 0, w, h],
		stroke: color,
		strokeWidth: pencil.input.strokeWidth,
		strokeLinecap: "round",
		strokeLinejoin: "round",
	});
});

return nodes;
