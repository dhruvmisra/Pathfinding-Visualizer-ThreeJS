<template>
	<div class="pathfinding-visualizer" @click="clearFocus">
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
			@clickEvent="onClick"
			@groundInitialized="ground = $event"
			@updateEnds="updateEnds"
		/>
		<div class="header-container">
			<transition-group name="slide" mode="out-in" tag="div" class="header py-1">
				<select
					class="form-select  m-1"
					id="algorithms"
					v-model="selectedAlgorithm"
					:disabled="visualizerState == 'running' || worldSetup"
					key="algo-select"
					v-if="!worldSetup"
				>
					<option :value="algo" v-for="algo in algorithms" :key="algo.algorithm">{{
						algo.displayName
					}}</option>
				</select>
				<button
					class="btn btn-primary m-1"
					@click="visualizeAlgorithm(15)"
					:disabled="visualizerState == 'running' || worldSetup"
					key="visualize"
					v-if="!worldSetup"
				>
					<img src="@/assets/icons/path.svg" alt="" />
					<span>Visualize {{ selectedAlgorithm.displayName }}!</span>
				</button>
				<button class="btn btn-danger m-1" @click="clearPath" key="clear-path">
					<img src="@/assets/icons/clear-path.svg" alt="" />
					<span>Clear path</span>
				</button>
				<button class="btn btn-danger m-1" @click="clearWalls" key="clear-walls">
					<img src="@/assets/icons/clear-wall.svg" alt="" />
					<span>Clear walls</span>
				</button>
			</transition-group>
		</div>
		<button
			class="btn btn-success btn-hover btn-setup m-1"
			:class="{ setup: worldSetup }"
			key="setup"
			v-if="controlType != 'PointerLock'"
			@click="worldSetup = !worldSetup"
		>
			<img src="@/assets/icons/setup.svg" alt="" />
			<span>{{ worldSetup ? "Complete Setup" : "Setup World" }}</span>
		</button>
		<button
			class="btn btn-warning btn-hover btn-camera m-1"
			key="switch-camera"
			v-if="!worldSetup"
			@click="switchControl"
		>
			<img src="@/assets/icons/street-view.svg" alt="" v-if="controlType == 'Orbit'" />
			<img src="@/assets/icons/perspective.svg" alt="" v-else />
			<span>{{ controlType == "Orbit" ? "Third-person" : "Perspective" }}</span>
		</button>
	</div>
</template>

<script>
import VisualizerCanvas from "./VisualizerCanvas.vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes, getNodesInShortestPathOrder, tweenToColor } from "./algorithms/helpers.js";
import { weightedSearchAlgorithm } from "./algorithms/weightedSearchAlgorithm.js";
import { unweightedSearchAlgorithm } from "./algorithms/unweightedSearchAlgorithm.js";

export default {
	components: {
		VisualizerCanvas,
	},
	data: () => ({
		visualizerState: "clear", // clear/running/finished
		algorithms: [
			{
				algorithm: "dijkstra",
				displayName: "Dijkstra's Algorithm",
				type: "weighted",
			},
			{
				algorithm: "astar",
				displayName: "A* Search",
				type: "weighted",
			},
			{
				algorithm: "bfs",
				displayName: "Breadth-first Search",
				type: "unweighted",
			},
			{
				algorithm: "dfs",
				displayName: "Depth-first Search",
				type: "unweighted",
			},
		],
		selectedAlgorithm: null,
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
			row: 16,
			col: 22,
		},
		worldSetup: false,
		colors: {
			default: { r: 1, g: 1, b: 1 },
			start: { r: 0, g: 1, b: 0 },
			finish: { r: 1, g: 0, b: 0 },
			wall: { r: 0.2, g: 0.2, b: 0.6 },
			visited: { r: 0.27, g: 0.878, b: 0.968 },
			path: { r: 1, g: 1, b: 0 },
		},
		hovering: ""
	}),
	watch: {
		selectedAlgorithm: function(newVal, oldVal) {
			if (newVal.type == "unweighted") {
				this.clearWalls();
			}
		},
		hovering: function(newVal, oldVal) {
			if(newVal != '') {
				setTimeout(() => {
					this.hovering = '';
				}, 1000);
			}
		}
	},
	created() {
		this.selectedAlgorithm = this.algorithms[0];
		this.start.gridId = this.start.row * this.cols + this.start.col;
		this.finish.gridId = this.finish.row * this.cols + this.finish.col;
	},
	methods: {
		onClick(node) {
			let vm = this;
			if (this.visualizerState == "running" || this.selectedAlgorithm.type == "unweighted") return;
			if (node.status != "wall") {
				if (node.status == "start" || node.status == "finish") return;
				node.status = "wall";
			} else {
				node.status = "default";
			}
		},

		updateEnds(obj) {
			if (obj.start) {
				this.start = obj.start;
				this.start.gridId = obj.start.row * this.cols + obj.start.col;
			} else {
				this.finish = obj.finish;
				this.finish.gridId = obj.finish.row * this.cols + obj.finish.col;
			}
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
			} else {
				this.controlType = "Orbit";
			}
		},

		moveCamera() {
			this.$refs.visualizer.controls.enabled = false;
			let startQuaternion = this.$refs.visualizer.camera.quaternion.clone();
			// let endQuaternion = new THREE.Quaternion().set(-0.4247082002778669, -0.33985114297998736, -0.17591989660616114, 0.8204732385702832);
			let endQuaternion = new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(-1, 1, 1),
				Math.PI / 10
			);
			let time = { t: 0 };
			new TWEEN.Tween(time)
				.to({ t: 1 }, 3000)
				// .easing(TWEEN.Easing.Quadratic.InOut)
				.onUpdate(() => {
					THREE.Quaternion.slerp(
						startQuaternion,
						endQuaternion,
						this.$refs.visualizer.camera.quaternion,
						time.t
					);
				})
				.onComplete(() => {
					// this.$refs.visualizer.controls.enabled = true;
					// this.$refs.visualizer.controls.update();
				})
				.start();
			// new TWEEN.Tween(this.$refs.visualizer.camera)
			// 	.to({ position: { x: -100, y: 200, z: 100 }}, 1000)
			// 	.onUpdate(() => {
			// 		this.$refs.visualizer.controls.update();
			// 	})
			// 	.onComplete(() => {
			// 		console.log(this.$refs.visualizer.camera.quaternion)
			// 		this.$refs.visualizer.controls.enabled = true;
			// 	})
			// 	.start();
		},

		visualizeAlgorithm(duration) {
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
						"poweredManhattanDistance"
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
				const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
				this.$nextTick(() => {
					this.animateAlgorithm(nodesToAnimate, nodesInShortestPathOrder, duration);
				});
			});
		},

		animateAlgorithm(visitedNodesInOrder, nodesInShortestPathOrder, duration) {
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
					tweenToColor(
						node,
						this.ground.geometry,
						[{ r: 1.0, g: 0.321, b: 0.784 }, this.colors.visited],
						300,
						{ position: false }
					);
				}, duration * i);
			}
		},

		animateShortestPath(nodesInShortestPathOrder, duration) {
			let vm = this;
			for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
				setTimeout(() => {
					const node = nodesInShortestPathOrder[i];
					tweenToColor(node, this.ground.geometry, [this.colors.path], undefined, {
						position: false,
					});
					if (i == nodesInShortestPathOrder.length - 1) {
						vm.visualizerState = "finished";
					}
				}, duration * i);
			}
		},

		clearFocus() {
			document.getElementsByClassName('header')[0].click();
		},
	},
};
</script>

<style lang="scss">
.pathfinding-visualizer {
	width: 100vw;
	height: 100vh;
	overflow: hidden;

	.header-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		background: transparent;
		overflow: auto;
		transition: all 500ms ease-out;

		&.setup {
			background: rgba(0, 190, 0, 0.336);
		}

		.header {
			width: 100%;
			display: flex;
			align-items: center;

			select {
				font-size: 0.9em;
				width: fit-content;
			}
		}
	}

	.btn {
		display: flex;
		align-items: center;
		font-size: 0.9em;
		box-shadow: 1px 3px 10px rgba(0, 0, 0, 0.15);
		// border-radius: 30px;

		&.btn-warning {
			color: white;
		}

		img {
			width: 20px;
			margin-right: 4px;
		}
	}

	.btn-hover {
		position: absolute;
		width: calc(70px + 1vw);
		background-color: rgba(0, 0, 0, 0.15);
		border: solid 1px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		transition: all 300ms ease-out;
		&:hover {
			width: 170px;
			span {
				text-align: center;
				opacity: 1;
			}
		}
		img {
			width: calc(25px + 0.5vw);
		}
		span {
			opacity: 0;
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			width: 100%;
			transition: all 300ms ease-out;
		}
	}

	.btn-setup {
		top: 60px;
		right: 5px;
		&.setup {
			background: rgba(0, 190, 0, 0.35);
		}
	}
	.btn-camera {
		top: 120px;
		right: 5px;
	}

	
	@media (max-width: 686px) {
		.btn {
			span {
				display: none;
			}
		}
		.btn-hover {
			&:hover {
				width: calc(70px + 0.5vw);
			}
		}
		.btn-camera {
			display: none;
		}
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
