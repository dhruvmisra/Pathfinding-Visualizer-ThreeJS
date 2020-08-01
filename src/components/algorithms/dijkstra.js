import { getAllNodes } from './helpers.js';

// Performs Dijkstra's algorithm; returns *all* nodes in the order
// in which they were visited. Also makes nodes point back to their
// previous node, effectively allowing us to compute the shortest path
// by backtracking from the finish node.
export function dijkstra(grid, startNode, finishNode) {
	const visitedNodesInOrder = [];
	startNode.info.distance = 0;
	const unvisitedNodes = getAllNodes(grid);
	while (!!unvisitedNodes.length) {
		sortNodesByDistance(unvisitedNodes);
		const closestNode = unvisitedNodes.shift();
		// If we encounter a wall, we skip it.
		if (closestNode.info.isWall) continue;
		// If the closest node is at a distance of infinity,
		// we must be trapped and should therefore stop.
		if (closestNode.info.distance === Infinity) return visitedNodesInOrder;
		closestNode.info.isVisited = true;
		visitedNodesInOrder.push(closestNode);
		if (closestNode.info === finishNode.info) return visitedNodesInOrder;
		updateUnvisitedNeighbors(closestNode, grid);
	}
}

function sortNodesByDistance(unvisitedNodes) {
	unvisitedNodes.sort((nodeA, nodeB) => nodeA.info.distance - nodeB.info.distance);
}

function updateUnvisitedNeighbors(node, grid) {
	const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
	for (const neighbor of unvisitedNeighbors) {
		neighbor.info.distance = node.info.distance + 1;
		neighbor.info.previousNode = node;
	}
}

function getUnvisitedNeighbors(node, grid) {
	const neighbors = [];
	const {col, row} = node.info;
	if (row > 0) neighbors.push(grid[row - 1][col]);
	if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
	if (col > 0) neighbors.push(grid[row][col - 1]);
	if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
	return neighbors.filter(neighbor => !neighbor.info.isVisited);
}


// Backtracks from the finishNode to find the shortest path.
// Only works when called *after* the dijkstra method above.
export function getNodesInShortestPathOrder(finishNode) {
	const nodesInShortestPathOrder = [];
	let currentNode = finishNode;
	while (currentNode !== null) {
		nodesInShortestPathOrder.unshift(currentNode);
		currentNode = currentNode.info.previousNode;
	}
	return nodesInShortestPathOrder;
}
