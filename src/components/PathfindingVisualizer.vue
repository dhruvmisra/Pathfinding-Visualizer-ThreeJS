<template>
	<div class="pathfinding-visualizer">
		<VisualizerCanvas
			ref="visualizer"
			:nodeDimensions="nodeDimensions"
			:rows="rows"
			:cols="cols"
			:grid="grid"
			:start="start"
			:finish="finish"
			:visualizerState="visualizerState"
			:colors="colors"
			:controlType="controlType"
			@clickEvent="onClick"
			@groundInitialized="ground = $event"
		/>
		<button class="btn btn-visualize" @click.stop="visualizeDijkstra(10)">
			Visualize Dijkstra's {{ visualizerState }}
		</button>
		<button class="btn btn-clear" @click.stop="clearGrid">Clear</button>
	</div>
</template>

<script>
import VisualizerCanvas from "./VisualizerCanvas.vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes, tweenToColor } from "./algorithms/helpers.js";
import { dijkstra, getNodesInShortestPathOrder } from "./algorithms/dijkstra.js";

export default {
	components: {
		VisualizerCanvas,
	},
	data: () => ({
		visualizerState: "clear", // clear/running/finished
		nodeDimensions: {
			height: 5,
			width: 5,
		},
		rows: 30,
		cols: 30,
		grid: [],
		ground: null,
		controlType: "Orbit",
		start: {
			row: 3,
			col: 5,
		},
		finish: {
			row: 10,
			col: 15,
		},
		colors: {
			default: { r: 1, g: 1, b: 1 },
			start: { r: 0, g: 1, b: 0 },
			finish: { r: 1, g: 0, b: 0 },
			wall: { r: 0.2, g: 0.2, b: 0.6 },
			visited: { r: 0.27, g: 0.878, b: 0.968 },
			path: { r: 1, g: 1, b: 0 },
		},
	}),
	methods: {
		onClick(node) {
			let vm = this;
			if (this.visualizerState == "running") return;
			if (!node.isWall) {
				if (node.isStart || node.isFinish) return;
				node.isWall = true;
			} else {
				node.isWall = false;
			}
		},

		clearGrid() {
			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					// let newRow = this.grid[i].slice(0);
					// newRow[j].isVisited = false;
					// newRow[j].distance = Infinity;
					// newRow[j].previousNode = null;
					// this.$set(this.grid, i, newRow);
					this.$set(this.grid[i][j], "isVisited", false);
					this.$set(this.grid[i][j], "distance", Infinity);
					this.$set(this.grid[i][j], "previousNode", null);
				}
			}
			this.visualizerState = "clear";
		},

		visualizeDijkstra(duration) {
			this.clearGrid();
			// Camera move
			// this.$refs.visualizer.controls.enabled = false;
			// console.log(JSON.parse(JSON.stringify(this.$refs.visualizer.camera.rotation)));
			// console.log(this.$refs.visualizer.controls)
			// new TWEEN.Tween(this.$refs.visualizer.camera)
			// 	.to({ position: { x: -100, y: 200, z: 100 }}, 10000)
			// 	.onUpdate(() => {
			// 		this.$refs.visualizer.controls.update();
			// 	})
			// 	.onComplete(() => {
			// 		console.log(this.$refs.visualizer.camera.rotation)
			// 	})
			// 	.start();
			// Camera move end

			this.visualizerState = "running";
			const startNode = this.grid[this.start.row][this.start.col];
			const finishNode = this.grid[this.finish.row][this.finish.col];
			const visitedNodesInOrder = dijkstra(this.grid, startNode, finishNode);
			const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
			this.animateDijkstra(visitedNodesInOrder, nodesInShortestPathOrder, duration);
		},
		animateDijkstra(visitedNodesInOrder, nodesInShortestPathOrder, duration) {
			for (let i = 0; i <= visitedNodesInOrder.length; i++) {
				if (i === visitedNodesInOrder.length) {
					setTimeout(() => {
						this.animateShortestPath(nodesInShortestPathOrder, 5 * duration);
					}, duration * i);
					return;
				}
				if (
					(visitedNodesInOrder[i].row == this.start.row &&
						visitedNodesInOrder[i].col == this.start.col) ||
					(visitedNodesInOrder[i].row == this.finish.row &&
						visitedNodesInOrder[i].col == this.finish.col)
				) {
					continue;
				}
				setTimeout(() => {
					const node = visitedNodesInOrder[i];
					if (!node) return;
					tweenToColor(node, this.ground.geometry, this.colors.visited);
				}, duration * i);
			}
		},
		animateShortestPath(nodesInShortestPathOrder, duration) {
			let vm = this;
			for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
				setTimeout(() => {
					const node = nodesInShortestPathOrder[i];
					tweenToColor(node, this.ground.geometry, this.colors.path);
					if (i == nodesInShortestPathOrder.length - 1) {
						vm.visualizerState = "finished";
					}
				}, duration * i);
			}
		},
	},
};
</script>

<style lang="scss">
.pathfinding-visualizer {
	width: 100vw;
	height: 100vh;

	.btn {
		position: absolute;
		padding: 10px 20px;
		border-radius: 5px;
		border: none;
		color: white;
		font-weight: 600;
		cursor: pointer;
		&:hover {
			filter: brightness(1.1);
		}

		&.btn-visualize {
			background: blueviolet;
			top: 10px;
			right: 10px;
		}
		&.btn-clear {
			background: yellowgreen;
			top: 60px;
			right: 10px;
		}
	}
}
</style>
