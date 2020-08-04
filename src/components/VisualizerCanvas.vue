<template>
	<div id="visualizer"></div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import TWEEN from "@tweenjs/tween.js";

import { getAllNodes, tweenToColor } from "./algorithms/helpers.js";

export default {
	props: ["nodeDimensions", "grid", "rows", "cols", "start", "finish", "visualizerState", "colors", "controlType"],
	data: () => ({
		scene: null,
		camera: null,
		// cameraY: 2,
		cameraY: 200,
		renderer: null,		
		pointerLock: {
			moveForward: false,
			moveBackward: false,
			moveLeft: false,
			moveRight: false,
			velocity: null,
			direction: null,
			prevTime: null,
		},
		controls: null,
		raycaster: null,
		ambientLight: null,
		ground: null,
		down: false,
		moved: false,
		currentEvent: null,
	}),
	watch: {
		controlType: function(newVal, oldVal) {
			this.setControls();
		}
	},
	mounted() {
		this.init();
		this.initGrid();
		let vm = this;
		// setTimeout(() => {
		// 	vm.controls.unlock();
		// 	vm.controlType = "Orbit";
		// }, 3000);
	},
	methods: {
		init() {
			let width = window.innerWidth,
				height = window.innerHeight;

			//Scene
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color(0xb1ffff);
			// this.scene.fog = new THREE.Fog( 0xffffff, 0, 250 );

			//Camera
			this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
			this.camera.position.y = this.cameraY;
			// var helper = new THREE.CameraHelper( this.camera );
			// this.scene.add( helper );

			//Renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(width, height);
			document.getElementById("visualizer").appendChild(this.renderer.domElement);

			// Controls
			this.setControls();

			//Raycaster
			this.raycaster = new THREE.Raycaster();

			//Geometry
			let gridWidth = this.cols * this.nodeDimensions.width,
				gridHeight = this.rows * this.nodeDimensions.height;
			let groundGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight, this.cols, this.rows);
			groundGeometry.rotateX(-Math.PI / 2);
			var groundMaterial = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
				vertexColors: THREE.FaceColors,
			});
			this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
			this.scene.add(this.ground);
			this.$emit('groundInitialized', this.ground);

			//Grid helper
			var size = this.cols * this.nodeDimensions.height;
			var divisions = this.cols;
			var gridHelper = new THREE.GridHelper(size, divisions, 0xafd8f8, 0xafd8f8);
			gridHelper.position.y = 0.01;
			this.scene.add(gridHelper);

			// Ambient Light
			// this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
			// this.scene.add(this.ambientLight);

			//Resize handler
			window.addEventListener("resize", this.resizeHandler);
			this.renderer.domElement.addEventListener("mousedown", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("touchstart", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("mousemove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("touchmove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("mouseup", this.onMouseup, true);
			this.renderer.domElement.addEventListener("mouseleave", this.onMouseLeave, true);
			this.renderer.domElement.addEventListener("touchend", this.onMouseup, true);

			this.gameLoop();
		},

		gameLoop() {
			requestAnimationFrame(this.gameLoop);
			if (this.controlType == "PointerLock") {
				this.raycaster.ray.origin.copy(this.controls.getObject().position);
				this.raycaster.ray.origin.y -= this.cameraY;

				var time = performance.now();
				var delta = (time - this.pointerLock.prevTime) / 1000;
				this.pointerLock.velocity.x -= this.pointerLock.velocity.x * 10.0 * delta;
				this.pointerLock.velocity.z -= this.pointerLock.velocity.z * 10.0 * delta;

				this.pointerLock.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

				this.pointerLock.direction.z =
					Number(this.pointerLock.moveForward) - Number(this.pointerLock.moveBackward);
				this.pointerLock.direction.x =
					Number(this.pointerLock.moveRight) - Number(this.pointerLock.moveLeft);
				this.pointerLock.direction.normalize(); // this ensures consistent movements in all directions

				if (this.pointerLock.moveForward || this.pointerLock.moveBackward)
					this.pointerLock.velocity.z -= this.pointerLock.direction.z * 400.0 * delta;
				if (this.pointerLock.moveLeft || this.pointerLock.moveRight)
					this.pointerLock.velocity.x -= this.pointerLock.direction.x * 400.0 * delta;

				// if (onObject === true) {
				// 	this.pointerLock.velocity.y = Math.max(0, this.pointerLock.velocity.y);
				// 	canJump = true;
				// }

				this.controls.moveRight(-this.pointerLock.velocity.x * delta);
				this.controls.moveForward(-this.pointerLock.velocity.z * delta);

				this.controls.getObject().position.y += this.pointerLock.velocity.y * delta; // new behavior

				if (this.controls.getObject().position.y < this.cameraY) {
					this.pointerLock.velocity.y = 0;
					this.controls.getObject().position.y = this.cameraY;
					this.pointerLock.canJump = true;
				}

				this.pointerLock.prevTime = time;
			}
			this.renderer.render(this.scene, this.camera);
			TWEEN.update();
		},

		setControls() {
			if (this.controlType == "Orbit") {
				// OrbitControls
				this.controls = new OrbitControls(this.camera, this.renderer.domElement);
				// this.controls.enableRotate = false;
				// this.controls.screenSpacePanning = true;
			} else if (this.controlType == "PointerLock") {
				this.cameraY = 2;
				// PointerLock controls
				this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
				this.controls.addEventListener("lock", function() {
					console.log("Lock");
				});
				this.controls.addEventListener("unlock", function() {
					console.log("Unlock");
				});
				this.scene.add(this.controls.getObject());
				document.addEventListener("keydown", this.onKeyDown, false);
				document.addEventListener("keyup", this.onKeyUp, false);
				this.pointerLock.velocity = new THREE.Vector3();
				this.pointerLock.direction = new THREE.Vector3();
				let vm = this;
				document.getElementById("visualizer").addEventListener("click", () => {
					if (vm.controlType == "PointerLock") {
						vm.controls.lock();
					}
				});
			}
		},

		resizeHandler(event) {
			let width = window.innerWidth,
				height = window.innerHeight;
			this.renderer.setSize(width, height);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
		},

		initGrid() {
			let vm = this;
			for (let i = 0; i < this.rows; i++) {
				let currentRow = [];
				for (let j = 0; j < this.cols; j++) {
					let node = this.createNode(i, j);
					currentRow.push(node);
				}
				this.grid.push(currentRow);
			}
			for(let i=0; i<this.rows; i++) {
				for(let j=0; j<this.cols; j++) {
					this.$watch(function() {
						return this.grid[i][j];
					}, this.nodeWatcher, { deep: true });
				}
			}
		},

		createNode(row, col) {
			let faces = {};
			let faceIndex = row * 2 * this.cols + col * 2;
			faces[1] = this.ground.geometry.faces[faceIndex];
			faceIndex = faceIndex % 2 == 0 ? faceIndex + 1 : faceIndex - 1;
			faces[2] = this.ground.geometry.faces[faceIndex];

			// Node info
			let node = {
				faces: faces,
				row: row,
				col: col,
				isStart: row === this.start.row && col === this.start.col,
				isFinish: row === this.finish.row && col === this.finish.col,
				distance: Infinity,
				isVisited: false,
				isWall: false,
				wall: null,
				previousNode: null,
			};

			if (row === this.start.row && col === this.start.col) {
				tweenToColor(node, this.ground.geometry, this.colors.start);
			} else if (row === this.finish.row && col === this.finish.col) {
				tweenToColor(node, this.ground.geometry, this.colors.finish);
			}

			return node;
		},

		async nodeWatcher(newVal, oldVal) {
			// newVal is a node
			if(this.visualizerState == "running") return;
			// console.log('WATCHER', newVal);
			this.updateNode(newVal);
		},

		async updateNode(node) {
			if(node.isWall) {
				console.log('WALL');
				tweenToColor(node, this.ground.geometry, this.colors.wall);
			} else if(node.isStart) {
				console.log('START');
				tweenToColor(node, this.ground.geometry, this.colors.start);
			} else if(node.isFinish) {
				console.log('FINISH');
				tweenToColor(node, this.ground.geometry, this.colors.finish);
			} else {
				console.log('DEFAULT');
				tweenToColor(node, this.ground.geometry, this.colors.default);
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
					dist > this.threshold ? this.moveHandler(event) : this.clickHandler(event);
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
		},

		clickHandler(event) {
			console.log("Clicked");
			let mouse = new THREE.Vector2();
			if (this.currentEvent.touches && this.currentEvent.touches.length > 0) {
				mouse.x = (this.currentEvent.touches[0].clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(this.currentEvent.touches[0].clientY / window.innerHeight) * 2 + 1;
			} else {
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			}
			this.raycaster.setFromCamera(mouse, this.camera);
			let intersects = this.raycaster.intersectObjects([this.ground]); //array
			if (intersects.length > 0) {
				var faceIndex = intersects[0].faceIndex;
				console.log(faceIndex);
				let coords = this.faceIndexToCoordinates(faceIndex);
				this.$emit("clickEvent", this.grid[coords.row][coords.col]);
			}
		},

		faceIndexToCoordinates(faceIndex) {
			// As each node has 2 faces
			// faceIndex = Math.floor(faceIndex/2);
			return {
				row: Math.floor((faceIndex/2)/this.rows),
				col: Math.floor((faceIndex/2)%this.cols)
			};
		},

		onKeyDown(event) {
			switch (event.keyCode) {
				case 38: // up
				case 87: // w
					this.pointerLock.moveForward = true;
					break;
				case 37: // left
				case 65: // a
					this.pointerLock.moveLeft = true;
					break;
				case 40: // down
				case 83: // s
					this.pointerLock.moveBackward = true;
					break;
				case 39: // right
				case 68: // d
					this.pointerLock.moveRight = true;
					break;
				case 32: // space
					if (this.pointerLock.canJump === true) this.pointerLock.velocity.y += 350;
					this.pointerLock.canJump = false;
					break;
			}
		},

		onKeyUp(event) {
			switch (event.keyCode) {
				case 38: // up
				case 87: // w
					this.pointerLock.moveForward = false;
					break;
				case 37: // left
				case 65: // a
					this.pointerLock.moveLeft = false;
					break;
				case 40: // down
				case 83: // s
					this.pointerLock.moveBackward = false;
					break;
				case 39: // right
				case 68: // d
					this.pointerLock.moveRight = false;
					break;
			}
		},
	},
};
</script>

<style lang="scss">
#visualizer {
	height: 100vh;
	width: 100vw;
}
</style>
