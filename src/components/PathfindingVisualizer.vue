<template>
	<div class="pathfinding-visualizer">
		<VisualizerCanvas 
			:nodeDimensions="nodeDimensions" 
			:rows="rows" 
			:cols="cols" 
			:grid="grid"
			:start="start"
			:finish="finish"
			@clickEvent="onClick"	
		/>
	</div>
</template>

<script>
import VisualizerCanvas from './VisualizerCanvas.vue';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes } from './algorithms/helpers.js';
import { dijkstra, getNodesInShortestPathOrder } from './algorithms/dijkstra.js';

export default {
	components: {
		VisualizerCanvas
	},
	data: () => ({
		nodeDimensions: {
			height: 1,
			width: 1,
		},
		rows: 20,
		cols: 30,
		grid: [],
		start: {
			row: 2,
			col: 4
		},
		finish: {
			row: 7,
			col: 15
		}
	}),
	methods: {
		onClick(intersects) {
			if(intersects[0].object.info.row == this.start.row && intersects[0].object.info.col == this.start.col) {
				this.visualizeDijkstra();
			} else {
				if(!intersects[0].object.info.isWall) {
					intersects[0].object.material.color.set(0x1111ff);
					let height = 20 + Math.random()*30;
					intersects[0].object.scale.set(1, 1, height);
					intersects[0].object.info.isWall = true;
				} else {
					intersects[0].object.material.color.set(0xffffff);
					intersects[0].object.scale.set(1, 1, 1/intersects[0].object.scale.z);
					intersects[0].object.info.isWall = false;
				}
			}
		},

		visualizeDijkstra() {
			const startNode = this.grid[this.start.row][this.start.col];
			const finishNode = this.grid[this.finish.row][this.finish.col];
			const visitedNodesInOrder = dijkstra(this.grid, startNode, finishNode);
			const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
			this.animateDijkstra(visitedNodesInOrder, nodesInShortestPathOrder);
		},
		animateDijkstra(visitedNodesInOrder, nodesInShortestPathOrder) {
			for (let i = 0; i <= visitedNodesInOrder.length; i++) {
				if (i === visitedNodesInOrder.length) {
					setTimeout(() => {
						this.animateShortestPath(nodesInShortestPathOrder);
					}, 10 * i);
					return;
				}
				setTimeout(() => {
					const node = visitedNodesInOrder[i];
					if(!node) return;
					let current = {
						r: node.material.color.r,
						g: node.material.color.g,
						b: node.material.color.b
					};
					let tween1 = new TWEEN.Tween(node.material.color)
						.to({r: 0.27, g: 0.878, b: 0.968}, 200)
					let tween2 = new TWEEN.Tween(node.material.color)
						.to({r: 0.388, g: 1, b: 0.388}, 200)
					let tween3 = new TWEEN.Tween(node.material.color)
						.to({r: 0.27, g: 0.878, b: 0.968}, 200)
					
					tween1.chain(tween2);
					tween2.chain(tween3);
					tween1.start();
				}, 10 * i);
			}
		},
		animateShortestPath(nodesInShortestPathOrder) {
			for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
				setTimeout(() => {
					const node = nodesInShortestPathOrder[i];
					let current = node.material.color;
					new TWEEN.Tween(current)
						.to({r: 255, g: 255, b: 0}, 300)
						.onUpdate(function() {
							node.material.color = current;
						})
						.start();
				}, 50 * i);
			}
		}
	},
};
</script>

<style lang="scss">
.pathfinding-visualizer {
	width: 100vw;
	height: 100vh;
}
</style>
