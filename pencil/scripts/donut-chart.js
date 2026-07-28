/**
 * @schema 2.11
 * @input data: string = "35,25,20,12,8"
 * @input colors: string = "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4"
 * @input innerRadius: number = 0.62
 */
const values = pencil.input.data.split(",").map(Number);
const colors = pencil.input.colors.split(",");
const total = values.reduce((a, b) => a + b, 0);
const gapDeg = values.length > 1 ? 2.5 : 0;

let angle = -90;
const nodes = [];
values.forEach((v, i) => {
	const rawSweep = total > 0 ? (v / total) * 360 : 0;
	const sweep = Math.max(0, rawSweep - gapDeg);
	nodes.push({
		type: "ellipse",
		name: "Slice " + (i + 1),
		x: 0,
		y: 0,
		width: pencil.width,
		height: pencil.height,
		startAngle: angle + gapDeg / 2,
		sweepAngle: sweep,
		innerRadius: pencil.input.innerRadius,
		fill: colors[i % colors.length],
	});
	angle += rawSweep;
});

return nodes;
