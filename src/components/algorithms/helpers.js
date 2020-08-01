export function getAllNodes(grid) {
  const nodes = [];
  for (const row of grid) {
		nodes.push(...row);
  }
  return nodes;
}