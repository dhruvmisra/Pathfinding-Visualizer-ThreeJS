// Returns an array of all nodes
export function getAllNodes(grid) {
	const nodes = [];
	for (const row of grid) {
		nodes.push(...row);
	}
	return nodes;
}

// Backtracks from the finishNode to find the shortest path
export function getNodesInShortestPathOrder(finishNode) {
	const nodesInShortestPathOrder = [];
	let currentNode = finishNode;
	//Excluding finish node
	if(currentNode.previousNode != null) {
		currentNode = currentNode.previousNode;
	}
	while (currentNode !== null && currentNode.previousNode !== null) {
		nodesInShortestPathOrder.unshift(currentNode);
		currentNode = currentNode.previousNode;
	}

	return nodesInShortestPathOrder;
}