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
			:worldSetup="worldSetup"
			:selectedAlgorithm="selectedAlgorithm"
			:streaming="streaming"
			:thresholdValue="thresholdValue"
			@clickEvent="onClick"
			@switchWorldSetup="worldSetup = !worldSetup"
			@switchControlType="controlType = controlType == 'Orbit' ? 'PointerLock' : 'Orbit'"
			@updateEnds="updateEnds"
		/>
		<transition-group name="slide" mode="out-in" tag="div" class="header py-1">
			<select
				id="algorithms"
				v-model="selectedAlgorithm"
				:disabled="visualizerState == 'running'"
				key="algo-select"
				v-if="!worldSetup"
			>
				<option :value="algo" v-for="algo in algorithms" :key="algo.algorithm">{{
					algo.displayName
				}}</option>
			</select>
			<Button
				class="accent"
				@click="visualizeAlgorithm()"
				:disabled="visualizerState == 'running' || worldSetup"
				key="visualize"
				v-if="!worldSetup"
			>
				<img class="fallback-icon" src="@/assets/icons/path.svg" alt="" />
				<span class="lg">Visualize!</span>
			</Button>
			<Button
				class="danger"
				@click="clearPath"
				key="clear-path"
				:disabled="visualizerState == 'running'"
			>
				<img class="fallback-icon" src="@/assets/icons/cross.svg" alt="" />
				<span class="lg">Clear path</span>
				<span class="sm">path</span>
			</Button>
			<Button
				class="danger"
				@click="clearWalls"
				key="clear-walls"
				:disabled="visualizerState == 'running'"
			>
				<img class="fallback-icon" src="@/assets/icons/cross.svg" alt="" />
				<span class="lg">Clear walls</span>
				<span class="sm">walls</span>
			</Button>
			<div class="maze-dropdown" key="maze-select">
				<Button class="info btn-maze" @click="onMazeDropdownClick">
					<img class="fallback-icon" src="@/assets/icons/maze.svg" alt="" />
					<span class="lg">Maze Algorithms</span>
				</Button>
				<div class="dropdown" v-if="dropdownOpen">
					<div
						class="dropdown-item"
						v-for="algo in mazeAlgorithms"
						:key="algo"
						@click="generateMaze(algo)"
					>
						{{ algo }}
					</div>
				</div>
			</div>
			<select
				id="algorithms"
				v-model="selectedSpeed"
				:disabled="visualizerState == 'running'"
				key="speed-select"
				v-if="!worldSetup"
			>
				<option :value="speed" v-for="speed in speeds" :key="speed.text">{{ speed.text }}</option>
			</select>
		</transition-group>
		<Button
			class="hover btn-setup warning"
			:class="{ setup: worldSetup }"
			key="setup"
			v-if="controlType != 'PointerLock'"
			@click="worldSetup = !worldSetup"
		>
			<img src="@/assets/icons/setup.svg" alt="" />
			<span class="lg">{{ worldSetup ? "Complete Setup" : "Setup World" }}</span>
		</Button>
		<Button
			class="hover btn-controls warning"
			key="switch-controls"
			v-if="!worldSetup"
			@click="switchControl"
		>
			<img src="@/assets/icons/street-view.svg" alt="" v-if="controlType == 'Orbit'" />
			<img src="@/assets/icons/perspective.svg" alt="" v-else />
			<span class="lg">{{ controlType == "Orbit" ? "First-person" : "Perspective" }}</span>
		</Button>
		<Button
			class="hover btn-camera warning"
			key="reset-camera"
			v-if="controlType == 'Orbit'"
			@click="$refs.visualizer.resetCamera()"
		>
			<img src="@/assets/icons/reset-camera.svg" alt="" />
			<span class="lg">Reset Camera</span>
		</Button>
		<Button
			class="hover btn-device-cam warning"
			:class="{ active: deviceCamInput }"
			key="device-camera"
			v-if="worldSetup"
			@click="deviceCamInput = !deviceCamInput"
		>
			<img src="@/assets/icons/camera.svg" alt="" />
			<span class="lg">{{ "Device Input" }}</span>
		</Button>

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
import VisualizerCanvas from "./VisualizerCanvas.vue";
import Info from "@/components/UI/Info.vue";
import THREE from "./Utils/ThreeInstance.js";
import TWEEN from "@tweenjs/tween.js";

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

		updateEnds(nodeObj) {
			if (nodeObj.start) {
				this.start = nodeObj.start;
				this.start.gridId = nodeObj.start.row * this.cols + nodeObj.start.col;
			} else {
				this.finish = nodeObj.finish;
				this.finish.gridId = nodeObj.finish.row * this.cols + nodeObj.finish.col;
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
@import "@/scss/variables.scss";

.pathfinding-visualizer {
	width: 100vw;
	height: 100vh;
	overflow: hidden;

	.header {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		transition: all 500ms ease-out;
		z-index: 1;

		&::before {
			content: "";
			position: absolute;
			top: -100%;
			left: 0;
			height: 100%;
			width: 100%;
			box-shadow: 1px 10px 50px rgba(0, 0, 0, 1);
			z-index: -1;
		}

		select {
			height: 40px;
			background: white;
			color: rgb(0, 0, 0);
			padding: 10px;
			margin: 2px;
			border-radius: 3px;
			border: none;
			width: fit-content;
		}
	}

	.btn {
		margin: 2px;
		font-size: 0.7em;
		font-weight: 600;
		text-transform: uppercase;
		.lg {
			display: block;
		}
		.sm {
			display: none;
		}
	}
	.btn-setup {
		top: 60px;
		&.setup {
			background: $success-low;
			&:hover {
				background: $success;
			}
		}
	}
	.btn-controls {
		top: 115px;
	}
	.btn-camera {
		top: 170px;
	}
	.btn-device-cam {
		top: 225px;
		&.active {
			background: $success-low;
			&:hover {
				background: $success;
			}
		}
	}
	.fallback-icon {
		display: none;
	}

	.maze-dropdown {
		position: relative;

		.dropdown {
			position: absolute;
			top: 100%;
			left: 0;
			width: 100%;
			min-width: fit-content;
			z-index: 2;

			.dropdown-item {
				padding: 10px;
				font-size: 0.8em;
				font-weight: 600;
				color: white;
				background: $secondary;
				cursor: pointer;
				&:hover {
					filter: brightness(0.9);
				}
			}
		}
	}

	@media (max-width: 792px) {
		.btn {
			.lg {
				display: none;
			}
			.sm {
				display: block;
				font-size: 0.7em;
			}
			&.hover {
				&:hover {
					width: 55px;
				}
			}
		}
		.btn-camera {
			top: 115px;
		}
		.btn-device-cam {
			top: 170px;
		}
		.fallback-icon {
			display: block;
		}
		.btn-controls {
			display: none;
		}
		.header {
			select {
				padding: 2px;
				font-size: 0.7em;
			}
		}
	}

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

	.slide-enter-active,
	.slide-leave-active {
		transition: all 500ms ease-in-out;
	}
	.slide-leave-active {
		position: absolute;
	}
	.slide-enter,
	.slide-leave-to {
		opacity: 0;
		transform: translateY(-50%);
	}
	.slide-move {
		transition: all 500ms ease-in-out;
	}
}
</style>
