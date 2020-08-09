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
			:setStartFinish="setStartFinish"
			@clickEvent="onClick"
			@groundInitialized="ground = $event"
		/>
		<div class="header py-1">
			<select class="form-select  m-1" id="algorithms" v-model="selectedAlgorithm">
				<option :value="algo" v-for="algo in algorithms" :key="algo">{{ algo }}</option>
			</select>
			<button class="btn btn-primary m-1" @click="visualizeDijkstra(10)">
				Visualize {{ selectedAlgorithm }}!
			</button>
			<button class="btn btn-danger m-1" @click="clearGrid">Clear</button>
			<button class="btn btn-info m-1" @click="setStartFinish = !setStartFinish">Change Start/Finish</button>
		</div>
	</div>
</template>

<script>
import VisualizerCanvas from "./VisualizerCanvas.vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes, tweenToColor } from "./algorithms/helpers.js";
import { dijkstra, getNodesInShortestPathOrder } from "./algorithms/dijkstra.js";
import { weightedSearchAlgorithm } from "./algorithms/weightedSearchAlgorithm.js";

export default {
	components: {
		VisualizerCanvas,
	},
	data: () => ({
		visualizerState: "clear", // clear/running/finished
		algorithms: ["Dijkstra's"],
		selectedAlgorithm: "Dijkstra's",
		nodeDimensions: {
			height: 5,
			width: 5,
		},
		rows: 30,
		cols: 30,
		grid: [],
		ground: null,
		controlType: "Orbit", // Orbit/PointerLock
		start: {
			row: 3,
			col: 5,
		},
		finish: {
			row: 10,
			col: 15,
		},
		setStartFinish: false,
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
			if (node.status != "wall") {
				if (node.status == "start" || node.status == "finish") return;
				node.status = "wall";
			} else {
				node.status = "default";
			}
		},

		clearGrid() {
			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					let status = "default";
					if(i == this.start.row && j == this.start.col) {
						status = "start";
					} else if(i == this.finish.row && j == this.finish.col) {
						status = "finish";
					}
					if(this.grid[i][j].status != "wall") {
						this.$set(this.grid[i][j], "status", status);
					}
					this.$set(this.grid[i][j], "distance", Infinity);
					this.$set(this.grid[i][j], "totalDistance", Infinity);
					this.$set(this.grid[i][j], "heuristicDistance", null);
					this.$set(this.grid[i][j], "direction", null);
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
			let nodesToAnimate = [];
			const success = weightedSearchAlgorithm(this.grid, startNode, finishNode, nodesToAnimate, "astar", "poweredManhattanDistance");
			console.log("success:", success);
			const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
			this.animateDijkstra(nodesToAnimate, nodesInShortestPathOrder, duration);
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

	.header {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		background: white;
		opacity: 0.2;
		transition: all 500ms ease-out;
		&:hover {
			opacity: 1;
		}

		select {
			width: fit-content;
		}
	}

	.btn-visualize {
		background: blueviolet;
	}
	.btn-clear {
		background: yellowgreen;
	}
}
</style>
