<template>
	<div id="visualizer"></div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes } from './algorithms/helpers.js';


// const START_NODE_ROW = 2;
// const START_NODE_COL = 4;
// const FINISH_NODE_ROW = 7;
// const FINISH_NODE_COL = 15;

export default {
	props: ['nodeDimensions', 'grid', 'rows', 'cols', 'start', 'finish'],
	data: () => ({
		scene: null,
		camera: null,
		cameraZ: 30,
		renderer: null,
		controls: null,
		raycaster: null,
		geometry: null,
		material: null,
		ambientLight: null,
		down: false,
		moved: false,
		currentEvent: null,
	}),
	mounted() {
		this.init();
		this.initGrid();
		this.addNodesToScene();
	},
	methods: {
		init() {
			let width = window.innerWidth,
				height = window.innerHeight;

			//Scene
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color( 0xffffff );

			//Camera
			this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
			// this.camera.position.y = 0;
			// this.setZ(window.innerWidth);
			this.camera.position.z = this.cameraZ;

			//Renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(width, height);
			document.getElementById("visualizer").appendChild(this.renderer.domElement);

			//OrbitControls
			this.controls = new OrbitControls(this.camera, this.renderer.domElement);
			// this.controls.enableRotate = false;
			// this.controls.mouseButtons = {
			// 	LEFT: THREE.MOUSE.PAN,
			// 	MIDDLE: THREE.MOUSE.DOLLY,
			// 	RIGHT: THREE.MOUSE.ROTATE,
			// };
			// this.controls.touches = {
			// 	ONE: THREE.TOUCH.PAN,
			// 	TWO: THREE.TOUCH.DOLLY_PAN,
			// };
			// this.controls.screenSpacePanning = true;

			//Raycaster
			this.raycaster = new THREE.Raycaster();

			//Geometry
			this.geometry = new THREE.BoxGeometry( this.nodeDimensions.width, this.nodeDimensions.height, 0.1 );

			// Ambient Light
			this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
			this.scene.add(this.ambientLight);

			//Resize handler
			window.addEventListener("resize", this.resizeHandler);

			this.renderer.domElement.addEventListener("mousedown", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("touchstart", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("mousemove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("touchmove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("mouseup", this.onMouseup, true);
			this.renderer.domElement.addEventListener("mouseleave", this.onMouseLeave, true);
			this.renderer.domElement.addEventListener("touchend", this.onMouseup, true);

			//Grid helper
			// var size = 10;
			// var divisions = 10;
			// var gridHelper = new THREE.GridHelper( size, divisions );
			// this.scene.add( gridHelper );

			this.gameLoop();
		},

		gameLoop() {
			requestAnimationFrame(this.gameLoop);
			this.render();
			TWEEN.update();
		},

		render() {
			this.renderer.render(this.scene, this.camera);
		},

		resizeHandler(event) {
			let vm = this;
			let width = window.innerWidth,
				height = window.innerHeight;
			vm.renderer.setSize(width, height);
			vm.camera.aspect = width / height;
			// vm.setZ(width);
			if (!vm.insideItem) {
				vm.camera.position.z = vm.cameraZ;
			}
			vm.camera.updateProjectionMatrix();
		},

		initGrid() {
			let vm = this;
			for (let i = 0; i < this.rows; i++) {
				let currentRow = [];
				for (let j = 0; j < this.cols; j++) {
					currentRow.push(this.createNode(i, j));
				}
				this.grid.push(currentRow);
			}
		},

		createNode(row, col) {
			let material;
			if(row === this.start.row && col === this.start.col) {
				material = new THREE.MeshLambertMaterial({
					color: 0xff0000,
				});
			} else if(row === this.finish.row && col === this.finish.col) {
				material = new THREE.MeshLambertMaterial({
					color: 0x00ff00,
				});
			}

			let node = new THREE.Mesh(this.geometry, material);

			// Node info
			node.info = {
				row: row,
				col: col,
				isStart: row === this.start.row && col === this.start.col,
				isFinish: row === this.finish.row && col === this.finish.col,
				distance: Infinity,
				isVisited: false,
				isWall: false,
				previousNode: null,
			}

			// Wireframe
			var geo = new THREE.EdgesGeometry( node.geometry ); // or WireframeGeometry
			var mat = new THREE.LineBasicMaterial( { color: 0xafd8f8, linewidth: 1 } );
			var wireframe = new THREE.LineSegments( geo, mat );
			node.add( wireframe );

			return node;
		},

		addNodesToScene() {
			let gridWidth = this.cols * this.nodeDimensions.width,
				gridHeight = this.rows * this.nodeDimensions.height;

			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					// node.geometry.computeBoundingBox();
					this.grid[i][j].position.set(
						this.grid[i][j].info.col + this.nodeDimensions.width / 2 - gridWidth / 2,
						-this.grid[i][j].info.row - this.nodeDimensions.height / 2 + gridHeight / 2,
						0
					);
					this.scene.add(this.grid[i][j]);
				}
			}
		},

		onMouseDown(event) {
			this.down = true;
			this.moved = false;
			this.currentEvent = event;
		},

		onMouseMove() {
			if (!this.down) return;
			this.moved = true;
		},

		onMouseLeave() {
			if (this.moved) {
				this.onMouseup();
			}
			this.down = false;
		},

		onMouseup(event) {
			if (this.moved) {
				let dist = 0;
				if (this.currentEvent.touches && this.currentEvent.touches.length > 0) {
					dist = this.calcDist(
						this.currentEvent.touches[0].pageX - event.changedTouches[0].pageX,
						this.currentEvent.touches[0].pageY - event.changedTouches[0].pageY
					);
					dist > this.threshold
						? this.moveHandler(event)
						: this.clickHandler(event);
				} else {
					this.moveHandler(event);
				}
			} else {
				this.clickHandler(event);
			}
			this.currentEvent = null;
			this.moved = false;
			this.down = false;
		},

		moveHandler(event) {
			console.log("Moved");
			// let vm = this;
			// let mouse = new THREE.Vector2();
			// this.raycaster.setFromCamera(mouse, this.camera);
			// let intersects = this.raycaster.intersectObjects(this.grid); //array
			// if (intersects.length > 0) {
			// 	this.selectObject(intersects[0].object);
			// 	this.snapBackCamera(intersects[0].object);
			// }
		},

		clickHandler(event) {
			console.log("Clicked");
			let mouse = new THREE.Vector2();
			if (this.currentEvent.touches && this.currentEvent.touches.length > 0) {
				mouse.x =
					(this.currentEvent.touches[0].clientX / window.innerWidth) * 2 - 1;
				mouse.y =
					-(this.currentEvent.touches[0].clientY / window.innerHeight) * 2 + 1;
			} else {
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			}
			this.raycaster.setFromCamera(mouse, this.camera);
			let intersects = this.raycaster.intersectObjects(getAllNodes(this.grid)); //array
			if(intersects.length > 0) {
				this.$emit('clickEvent', intersects);
			}
		},
	}
}
</script>

<style>

</style>