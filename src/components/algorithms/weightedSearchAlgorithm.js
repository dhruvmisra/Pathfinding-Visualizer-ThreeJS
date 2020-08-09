import { getAllNodes } from './helpers.js';

export function weightedSearchAlgorithm(grid, start, target, nodesToAnimate, name, heuristic) {
  // Initialze nodes
	start.distance = 0;
	start.direction = "right";
	if(name == "astar") {
		start.totalDistance = 0;
	}
	// Should be a Priority Queue
  let unvisitedNodes = getAllNodes(grid);
  while (unvisitedNodes.length) {
		let currentNode = closestNode(unvisitedNodes, name);
    while (currentNode.status === "wall" && unvisitedNodes.length) {
      currentNode = closestNode(unvisitedNodes, name)
		}
    if (currentNode.distance === Infinity) return false;
    nodesToAnimate.push(currentNode);
    currentNode.status = "visited";
    if (currentNode === target) return "success!";
    if (name === "CLA" || name === "greedy" || name == "astar") {
      updateNeighbors(grid, currentNode, start, target, name, heuristic);
    } else if (name === "dijkstra") {
      updateNeighbors(grid, currentNode);
    }
  }
}

function closestNode(unvisitedNodes, name) {
  let currentClosest, index;
  for (let i = 0; i < unvisitedNodes.length; i++) {
		if(name == "astar") {
			if (!currentClosest || currentClosest.totalDistance > unvisitedNodes[i].totalDistance) {
				currentClosest = unvisitedNodes[i];
				index = i;
			} else if (currentClosest.totalDistance === unvisitedNodes[i].totalDistance) {
				if (currentClosest.heuristicDistance > unvisitedNodes[i].heuristicDistance) {
					currentClosest = unvisitedNodes[i];
					index = i;
				}
			}
		} else {
			if (!currentClosest || currentClosest.distance > unvisitedNodes[i].distance) {
				currentClosest = unvisitedNodes[i];
				index = i;
			}
		}
  }
  unvisitedNodes.splice(index, 1);
  return currentClosest;
}

function updateNeighbors(grid, node, start, target, name, heuristic) {
  let neighbors = getNeighbors(node, grid);
  for (let neighbor of neighbors) {
    if (target) {
      updateNode(node, neighbor, start, target, name, heuristic);
    } else {
      updateNode(node, neighbor);
    }
  }
}

function averageNumberOfNodesBetween(currentNode) {
  let num = 0;
  while (currentNode.previousNode) {
    num++;
    currentNode = currentNode.previousNode;
  }
  return num;
}


function updateNode(currentNode, targetNode, actualStartNode, actualTargetNode, name, heuristic) {
  let distance = getDistance(currentNode, targetNode);
  let distanceToCompare;
  if (actualTargetNode && name === "CLA") {
    let weight = targetNode.weight === 15 ? 15 : 1;
    if (heuristic === "manhattanDistance") {
      distanceToCompare = currentNode.distance + (distance[0] + weight) * manhattanDistance(targetNode, actualTargetNode);
    } else if (heuristic === "poweredManhattanDistance") {
      distanceToCompare = currentNode.distance + targetNode.weight + distance[0] + Math.pow(manhattanDistance(targetNode, actualTargetNode), 2);
    } else if (heuristic === "extraPoweredManhattanDistance") {
      distanceToCompare = currentNode.distance + (distance[0] + weight) * Math.pow(manhattanDistance(targetNode, actualTargetNode), 7);
    }
  } else if (actualTargetNode && name === "greedy") {
    distanceToCompare = targetNode.weight + distance[0] + manhattanDistance(targetNode, actualTargetNode);
  } else if(name == "astar") {
		if (!targetNode.heuristicDistance) targetNode.heuristicDistance = manhattanDistance(targetNode, actualTargetNode);
		distanceToCompare = currentNode.distance + targetNode.weight + distance[0];
	} else {
    distanceToCompare = currentNode.distance + targetNode.weight + distance[0];
  }
  if (distanceToCompare < targetNode.distance) {
    targetNode.distance = distanceToCompare;
    targetNode.previousNode = currentNode;
    targetNode.path = distance[1];
		targetNode.direction = distance[2];
		if(name == "astar") {
			targetNode.totalDistance = targetNode.distance + targetNode.heuristicDistance;
		}
  }
}

function getNeighbors(node, grid) {
	const neighbors = [];
	const {col, row} = node;
	if (row > 0) neighbors.push(grid[row - 1][col]);
	if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
	if (col > 0) neighbors.push(grid[row][col - 1]);
	if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
	return neighbors.filter(neighbor => neighbor.stutus != "visited");
}


function getDistance(nodeOne, nodeTwo) {
  let x1 = nodeOne.row;
  let y1 = nodeOne.col;
  let x2 = nodeTwo.row;
  let y2 = nodeTwo.col;
	if (x2 < x1 && y1 === y2) {
    if (nodeOne.direction === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.direction === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.direction === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.direction === "down") {
      return [3, ["r", "r", "f"], "up"];
    } else if (nodeOne.direction === "up-right") {
      return [1.5, null, "up"];
    } else if (nodeOne.direction === "down-right") {
      return [2.5, null, "up"];
    } else if (nodeOne.direction === "up-left") {
      return [1.5, null, "up"];
    } else if (nodeOne.direction === "down-left") {
      return [2.5, null, "up"];
    }
  } else if (x2 > x1 && y1 === y2) {
    if (nodeOne.direction === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.direction === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.direction === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.direction === "down") {
      return [1, ["f"], "down"];
    } else if (nodeOne.direction === "up-right") {
      return [2.5, null, "down"];
    } else if (nodeOne.direction === "down-right") {
      return [1.5, null, "down"];
    } else if (nodeOne.direction === "up-left") {
      return [2.5, null, "down"];
    } else if (nodeOne.direction === "down-left") {
      return [1.5, null, "down"];
    }
  }
  if (y2 < y1 && x1 === x2) {
    if (nodeOne.direction === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.direction === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.direction === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.direction === "down") {
      return [2, ["r", "f"], "left"];
    } else if (nodeOne.direction === "up-right") {
      return [2.5, null, "left"];
    } else if (nodeOne.direction === "down-right") {
      return [2.5, null, "left"];
    } else if (nodeOne.direction === "up-left") {
      return [1.5, null, "left"];
    } else if (nodeOne.direction === "down-left") {
      return [1.5, null, "left"];
    }
  } else if (y2 > y1 && x1 === x2) {
    if (nodeOne.direction === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.direction === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.direction === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.direction === "down") {
      return [2, ["l", "f"], "right"];
    } else if (nodeOne.direction === "up-right") {
      return [1.5, null, "right"];
    } else if (nodeOne.direction === "down-right") {
      return [1.5, null, "right"];
    } else if (nodeOne.direction === "up-left") {
      return [2.5, null, "right"];
    } else if (nodeOne.direction === "down-left") {
      return [2.5, null, "right"];
    }
  } 
}

function manhattanDistance(nodeOne, nodeTwo) {
  let nodeOneCoordinates = [nodeOne.row, nodeOne.col];
  let nodeTwoCoordinates = [nodeTwo.row, nodeTwo.col]
  let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
  let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
  return (xChange + yChange);
}