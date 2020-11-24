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
			:colors="colors"
			:visualizerState="visualizerState"
			:controlType="controlType"
			:worldSetup="worldSetup"
			:selectedAlgorithm="selectedAlgorithm"
			:streaming="streaming"
			:thresholdValue="thresholdValue"
			@clickEvent="onClick"
			@switchWorldSetup="worldSetup = !worldSetup"
			@switchControlType="controlType = controlType == 'Orbit' ? 'PointerLock' : 'Orbit'"
			@updateEnds="updateEnds"
		/>
		<InteractionUI 
			:visualizerState="visualizerState"
			:controlType="controlType"
			:worldSetup.sync="worldSetup"
			:algorithms="algorithms"
			:selectedAlgorithm.sync="selectedAlgorithm"
			:mazeAlgorithms="mazeAlgorithms"
			:speeds="speeds"
			:selectedSpeed.sync="selectedSpeed"
			:deviceCamInput.sync="deviceCamInput"
			:dropdownOpen="dropdownOpen"
			@visualize-algorithm="visualizeAlgorithm"
			@clear-path="clearPath"
			@clear-walls="clearWalls"
			@maze-dropdown-clicked="onMazeDropdownClick"
			@generate-maze="generateMaze"
			@switch-control="switchControl"
			@reset-camera="$refs.visualizer.resetCamera()"
		/>

		<canvas id="video-canvas"></canvas>
		<video id="video" autoplay></video>
		<input
			id="threshold"
			ref="threshold"
			v-if="deviceCamInput"
			type="range"
			min="0"
			max="255"
			v-model="thresholdValue"
		/>

		<Info ref="info" :colors="colors" @unlockSwarm="unlockSwarm"></Info>
	</div>
</template>

<script>
import THREE from "./Utils/ThreeInstance.js";
import TWEEN from "@tweenjs/tween.js";
import VisualizerCanvas from "./VisualizerCanvas.vue";
import InteractionUI from "@/components/UI/InteractionUI.vue";
import Info from "@/components/UI/Info.vue";

import { getNodesInShortestPathOrder } from "./algorithms/helpers.js";
import { weightedSearchAlgorithm } from "./algorithms/weightedSearchAlgorithm.js";
import { unweightedSearchAlgorithm } from "./algorithms/unweightedSearchAlgorithm.js";
import { randomMaze, recursiveDivisionMaze } from "./algorithms/mazeAlgorithms.js";
import ALGORITHMS from "./algorithms/algorithmsInfo.json";
import SWARM from "./algorithms/swarmInfo.json";
import CONFIG from "./config.js";

export default {
	components: {
		VisualizerCanvas,
		InteractionUI,
		Info,
	},
	data: () => ({
		visualizerState: "clear", // clear/running/finished
		algorithms: [],
		swarm: null,
		selectedAlgorithm: null,
		speeds: [
			{
				text: "Fast",
				value: 15,
			},
			{
				text: "Medium",
				value: 25,
			},
			{
				text: "Slow",
				value: 45,
			},
			{
				text: "Super Slow",
				value: 80,
			},
		],
		selectedSpeed: null,
		mazeAlgorithms: ["Random Maze", "Recursive Division"],
		dropdownOpen: false,
		nodeDimensions: null,
		rows: null,
		cols: null,
		start: null,
		finish: null,
		grid: [],
		controlType: "Orbit", // Orbit/PointerLock
		worldSetup: false,
		deviceCamInput: false,
		streaming: false,
		thresholdValue: 100,
		colors: null,
		infoObject: {
			heading: "",
			text: "",
		},
	}),
	watch: {
		selectedAlgorithm: function(newVal, oldVal) {
			if (newVal.type == "unweighted") {
				this.clearWalls();
			}
			this.dropdownOpen = false;
			this.$refs.info.resetToLegends();
		},
		worldSetup: function(newVal, oldVal) {
			if (newVal) {
				this.clearPath();
			} else {
				this.deviceCamInput = false;
			}
		},
		deviceCamInput: function(newVal, oldVal) {
			if (newVal) {
				function hasGetUserMedia() {
					return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
				}

				this.clearWalls();

				const videoCanvas = document.querySelector("#video-canvas");
				let videoCtx = videoCanvas.getContext("2d");
				const video = document.querySelector("video");
				this.thresholdValue = 100;
				const scale = 17;
				const width = 512;
				const height = 512;
				if (hasGetUserMedia()) {
					videoCanvas.width = width / scale;
					videoCanvas.height = height / scale;
					const constraints = {
						video: { width: { exact: width / scale }, height: { exact: height / scale } },
					};

					navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
						video.srcObject = stream;
						this.streaming = true;
					});
				} else {
					alert("getUserMedia() is not supported by your browser");
				}
			} else {
				const video = document.querySelector("video");
				const stream = video.srcObject;
				const tracks = stream.getTracks();

				tracks.forEach(function(track) {
					track.stop();
				});

				video.srcObject = null;
				this.streaming = false;
			}
		},
	},

	created() {
		// Initialization
		this.nodeDimensions = CONFIG.NODEDIMENSIONS;
		this.rows = CONFIG.ROWS;
		this.cols = CONFIG.COLS;
		this.start = CONFIG.START;
		this.finish = CONFIG.FINISH;
		this.colors = CONFIG.COLORS;
		this.algorithms = ALGORITHMS;
		this.swarm = SWARM;

		// Computed initialization
		this.selectedAlgorithm = this.algorithms[0];
		this.start.gridId = this.start.row * this.cols + this.start.col;
		this.finish.gridId = this.finish.row * this.cols + this.finish.col;
		this.selectedSpeed = this.speeds[0];
	},

	methods: {
		onClick(node) {
			let vm = this;
			if (this.visualizerState == "running") return;
			if (this.selectedAlgorithm.type == "unweighted") {
				this.$refs.info.error({
					heading: "Uh oh",
					text: "Can't add walls in an unweighted algorithm.",
				});
				return;
			}
			if (node.status != "wall") {
				if (node.status == "start" || node.status == "finish") return;
				node.status = "wall";
			} else {
				node.status = "default";
			}
		},

		onMazeDropdownClick() {
			if (this.selectedAlgorithm.type != "unweighted") {
				this.dropdownOpen = !this.dropdownOpen;
			} else {
				this.dropdownOpen = false;
				this.$refs.info.error({
					heading: "Uh oh",
					text: "Can't add walls in an unweighted algorithm.",
				});
			}
		},

		updateEnds(coordsToUpdate) {
			if (coordsToUpdate.start) {
				this.start = coordsToUpdate.start;
				this.start.gridId = coordsToUpdate.start.row * this.cols + coordsToUpdate.start.col;
			} else {
				this.finish = coordsToUpdate.finish;
				this.finish.gridId = coordsToUpdate.finish.row * this.cols + coordsToUpdate.finish.col;
			}
		},

		unlockSwarm() {
			console.log("Unlocked Swarm");
			this.algorithms.push(this.swarm);
		},

		clearWalls() {
			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					let status = "default";
					if (this.grid[i][j].status == "wall") {
						this.$set(this.grid[i][j], "status", status);
					}
				}
			}
		},

		clearPath() {
			TWEEN.removeAll();
			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					let status = "default";
					if (i == this.start.row && j == this.start.col) {
						status = "start";
					} else if (i == this.finish.row && j == this.finish.col) {
						status = "finish";
					}
					if (this.grid[i][j].status != "wall") {
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

		switchControl() {
			if (this.controlType == "Orbit") {
				this.controlType = "PointerLock";
				setTimeout(() => {
					this.$refs.info.alert({
						heading: "Start First-Person",
						text:
							"Click anywhere on the canvas to start the First-Person mouse movement. Press Esc to exit.",
					});
				}, 2000);
			} else {
				this.controlType = "Orbit";
				this.$refs.info.resetToLegends();
			}
		},

		/* To move the camera in a cinematic way after clicking Visualize */
		// moveCamera() {
		// 	this.$refs.visualizer.controls.enabled = false;
		// 	new TWEEN.Tween(this.$refs.visualizer.camera.position)
		// 		.to({ x: -100, y: 200, z: 100 }, 2000)
		// 		.easing(TWEEN.Easing.Exponential.Out)
		// 		.onUpdate(() => {
		// 			this.$refs.visualizer.camera.lookAt(this.$refs.visualizer.scene.position);
		// 			// this.$refs.visualizer.controls.update();
		// 		})
		// 		.onComplete(() => {
		// 			this.$refs.visualizer.controls.enabled = true;
		// 		})
		// 		.start();
		// 	// new TWEEN.Tween(this.$refs.visualizer.camera.rotation)
		// 	// 	.to({ x: -(Math.PI/3), y: -(Math.PI/8), z: 0 }, 2000)
		// 	// 	.easing(TWEEN.Easing.Exponential.Out)
		// 	// 	.start();
		// },

		visualizeAlgorithm() {
			let timerDelay = this.selectedSpeed.value;
			this.clearPath();
			// this.moveCamera();
			this.$nextTick(() => {
				this.visualizerState = "running";
				const startNode = this.grid[this.start.row][this.start.col];
				const finishNode = this.grid[this.finish.row][this.finish.col];
				let nodesToAnimate = [];
				let success;
				if (this.selectedAlgorithm.type == "weighted") {
					success = weightedSearchAlgorithm(
						this.grid,
						startNode,
						finishNode,
						nodesToAnimate,
						this.selectedAlgorithm.algorithm,
						this.selectedAlgorithm.heuristic
					);
				} else {
					this.clearWalls();
					success = unweightedSearchAlgorithm(
						this.grid,
						startNode,
						finishNode,
						nodesToAnimate,
						this.selectedAlgorithm.algorithm
					);
				}
				console.log("success:", success);
				if (success == false) {
					this.clearPath();
					this.visualizerState = "finished";
					this.$refs.info.error({
						heading: "Uh oh",
						text: "Can't find the path when one end is unreachable.",
					});
					return;
				}
				const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
				this.$nextTick(() => {
					this.animateAlgorithm(nodesToAnimate, nodesInShortestPathOrder, timerDelay);
				});
			});
		},

		animateAlgorithm(visitedNodesInOrder, nodesInShortestPathOrder, timerDelay) {
			for (let i = 0; i <= visitedNodesInOrder.length; i++) {
				if (i === visitedNodesInOrder.length) {
					setTimeout(() => {
						this.animateShortestPath(nodesInShortestPathOrder, 5 * timerDelay);
					}, timerDelay * i);
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
					node.tweenToColor([{ r: 1.0, g: 0.321, b: 0.784 }, this.colors.visited], 300, {
						position: false,
					});
				}, timerDelay * i);
			}
		},

		animateShortestPath(nodesInShortestPathOrder, timerDelay) {
			let vm = this;
			for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
				setTimeout(() => {
					const node = nodesInShortestPathOrder[i];
					node.tweenToColor([this.colors.path], undefined, {
						position: false,
					});
					if (i == nodesInShortestPathOrder.length - 1) {
						vm.visualizerState = "finished";
						vm.$refs.info.alert(this.selectedAlgorithm.info);
					}
				}, timerDelay * i);
			}
		},

		generateMaze(algo) {
			this.dropdownOpen = false;
			this.clearWalls();
			this.clearPath();
			let nodesToAnimate = [];
			if (algo == "Random Maze") {
				randomMaze(this.grid, nodesToAnimate, "wall");
			} else {
				// Parameters: 2, this.grid.length-3 => First row and col after leaving 1 from the boundary
				recursiveDivisionMaze(
					this.grid,
					2,
					this.grid.length - 3,
					2,
					this.grid[0].length - 3,
					"horizontal",
					false,
					nodesToAnimate,
					"wall"
				);
			}
			this.animateMaze(nodesToAnimate, "wall", 30);
		},

		animateMaze(visitedNodesInOrder, type, timerDelay) {
			for (let i = 0; i < visitedNodesInOrder.length; i++) {
				setTimeout(() => {
					const node = visitedNodesInOrder[i];
					node.status = type;
				}, timerDelay * i);
			}
		}
	}
};
</script>

<style lang="scss">
.pathfinding-visualizer {
	width: 100vw;
	height: 100vh;
	overflow: hidden;

	#video-canvas {
		position: absolute;
		bottom: 10px;
		left: 0;
		width: 80px;
		height: 80px;
		visibility: hidden;
	}
	#video {
		position: absolute;
		bottom: 80px;
		left: 4px;
		width: 80px;
		height: 80px;
		transform: rotateY(180deg);
		-webkit-transform: rotateY(180deg); /* Safari and Chrome */
		-moz-transform: rotateY(180deg); /* Firefox */
	}
	#threshold {
		position: absolute;
		bottom: 55px;
		left: 3px;
		width: 80px;
	}
}
</style>
