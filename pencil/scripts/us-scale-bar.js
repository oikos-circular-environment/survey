/**
 * @schema 2.11
 * @input value: number = 0.68
 */
const bands = ["#d03b3b", "#ec835a", "#fab219", "#0ca30c"];
const w = pencil.width;
const h = pencil.height;
const bandW = w / bands.length;
const gap = 2;

const nodes = bands.map((color, i) => ({
	type: "rectangle",
	name: "Band " + (i + 1),
	x: i * bandW + (i > 0 ? gap / 2 : 0),
	y: 0,
	width: bandW - (i > 0 && i < bands.length - 1 ? gap : gap / 2),
	height: h,
	fill: color,
	cornerRadius:
		i === 0
			? [h / 2, 0, 0, h / 2]
			: i === bands.length - 1
				? [0, h / 2, h / 2, 0]
				: 0,
}));

const clamped = Math.max(0, Math.min(1, pencil.input.value));
const markerX = Math.max(2, Math.min(w - 2, clamped * w));
nodes.push({
	type: "rectangle",
	name: "Marker",
	x: markerX - 2,
	y: -4,
	width: 4,
	height: h + 8,
	fill: "#0b0b0b",
	cornerRadius: 2,
});

return nodes;
