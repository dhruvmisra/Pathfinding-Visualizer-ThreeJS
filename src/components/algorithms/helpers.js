import TWEEN from "@tweenjs/tween.js";

export function getAllNodes(grid) {
  const nodes = [];
  for (const row of grid) {
		nodes.push(...row);
  }
  return nodes;
}

export function tweenToColor(node, geometry, color, duration = 300, chain) {
	new TWEEN.Tween(node.faces[1].color)
		.to(color, duration)
		.onUpdate(() => {
			geometry.colorsNeedUpdate = true;
		})
		.start();
 new TWEEN.Tween(node.faces[2].color)
		.to(color, duration)
		.onUpdate(() => {
			geometry.colorsNeedUpdate = true;
		})
		.start();
}