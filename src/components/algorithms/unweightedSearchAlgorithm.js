export function unweightedSearchAlgorithm(grid, start, target, nodesToAnimate, name) {
  let structure = [start];
  let exploredNodes = {start: true};
  while (structure.length) {
    let currentNode = name === "bfs" ? structure.shift() : structure.pop();
    nodesToAnimate.push(currentNode);
    if (name === "dfs") exploredNodes[currentNode.id] = true;
		currentNode.status = "visited";
		// Ending condition
		if (currentNode.id === target.id) return "success!";
		// Update neighbors
    let currentNeighbors = getNeighbors(currentNode, grid, name);
    currentNeighbors.forEach(neighbor => {
      if (!exploredNodes[neighbor.id]) {
        if (name === "bfs") exploredNodes[neighbor.id] = true;
				if(neighbor.id != start.id) {
					neighbor.previousNode = currentNode;
				}
        structure.push(neighbor);
      }
		});
  }
  return false;
}

function getNeighbors(node, grid, name) {
	const neighbors = [];
	const {col, row} = node;
	let neighbor;
	if (row > 0) {
		neighbor = grid[row - 1][col];
		if (name === "bfs") {
			neighbors.push(neighbor);
		} else {
			neighbors.unshift(neighbor);
		}
	}
	if (row < grid.length - 1) {
		neighbor = grid[row + 1][col];
		if (name === "bfs") {
			neighbors.push(neighbor);
		} else {
			neighbors.unshift(neighbor);
		}
	}
	if (col > 0) {
		neighbor = grid[row][col - 1];
		if (name === "bfs") {
			neighbors.push(neighbor);
		} else {
			neighbors.unshift(neighbor);
		}
	}
	if (col < grid[0].length - 1) {
		neighbor = grid[row][col + 1];
		if (name === "bfs") {
			neighbors.push(neighbor);
		} else {
			neighbors.unshift(neighbor);
		}
	}
	return neighbors.filter(neighbor => neighbor.stutus != "visited");
}