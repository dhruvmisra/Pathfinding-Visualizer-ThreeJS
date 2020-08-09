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
	props: [
		"nodeDimensions",
		"grid",
		"rows",
		"cols",
		"start",
		"finish",
		"visualizerState",
		"colors",
		"controlType",
		"setStartFinish"
	],
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
		walls: {},
		wallTextures: [
			{
				path: 'building.jpg',
				repeatY: 2, 
			},
			{
				path: 'building2.png',
				repeatY: 3, 
			},
			{
				path: 'building3.png',
				repeatY: 4, 
			},
		],
		down: false,
		moved: false,
		currentEvent: null,
	}),
	computed: {
		clickableObjects() {
			let objects = [];
			objects.push(this.ground);
			for (let id of Object.keys(this.walls)) {
				if (this.walls[id].visible) {
					objects.push(this.walls[id]);
				}
			}
			return objects;
		},
	},
	watch: {
		controlType: function(newVal, oldVal) {
			this.setControls();
		},
	},
	mounted() {
		this.init();
	},
	methods: {
		init() {
			let width = window.innerWidth,
				height = window.innerHeight;

			//Scene
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color(0x92B3D4);
			this.scene.fog = new THREE.Fog(this.scene.background, 1, 750);
			// this.scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );

			//Camera
			this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
			this.camera.position.y = this.cameraY;
			// var helper = new THREE.CameraHelper( this.camera );
			// this.scene.add( helper );

			//Renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(width, height);
			this.renderer.shadowMap.enabled = true;
			// this.renderer.shadowMap.type = THREE.BasicShadowMap;
			document.getElementById("visualizer").appendChild(this.renderer.domElement);

			// Controls
			this.setControls();

			//Raycaster
			this.raycaster = new THREE.Raycaster();

			//Geometry
			let gridWidth = this.cols * this.nodeDimensions.width,
				gridHeight = this.rows * this.nodeDimensions.height;
			let vm = this;

			let groundGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight, this.cols, this.rows);
			groundGeometry.rotateX(-Math.PI / 2);
			let loader = new THREE.TextureLoader();
			loader.load(require("@/assets/textures/ground.jpg"), function(texture) {
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.x = 30;
				texture.repeat.y = 30;
				var groundMaterial = new THREE.MeshLambertMaterial({
					map: texture,
					side: THREE.DoubleSide,
					vertexColors: THREE.FaceColors,
				});
				vm.ground = new THREE.Mesh(groundGeometry, groundMaterial);
				vm.ground.receiveShadow = true;
				vm.scene.add(vm.ground);
				vm.initGrid();
				vm.$emit("groundInitialized", vm.ground);
			}, undefined, function(error) {
				console.log(error);
			});

			//Grid helper
			var size = this.cols * this.nodeDimensions.height;
			var divisions = this.cols;
			var gridHelper = new THREE.GridHelper(size, divisions, 0x636b4c, 0x636b4c);
			gridHelper.position.y = 0.01;
			this.scene.add(gridHelper);

			// Ambient Light
			this.ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
			this.scene.add(this.ambientLight);

			// LIGHTS
			let dirLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
			dirLight.color.setHSL( 0.1, 1, 0.95 );
			dirLight.position.set( - 1, 1.75, 1 );
			dirLight.position.multiplyScalar( 70 );
			this.scene.add( dirLight );

			dirLight.castShadow = true;

			dirLight.shadow.mapSize.width = 2048;
			dirLight.shadow.mapSize.height = 2048;

			var d = 200;
			dirLight.shadow.camera.left = - d;
			dirLight.shadow.camera.right = d;
			dirLight.shadow.camera.top = d;
			dirLight.shadow.camera.bottom = - d;

			dirLight.shadow.camera.far = 350;

			let dirLightHeper = new THREE.DirectionalLightHelper( dirLight, 10 );
			this.scene.add( dirLightHeper );
			var shadowHelper = new THREE.CameraHelper( dirLight.shadow.camera );
			this.scene.add(shadowHelper)

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
			for (let i = 0; i < this.rows; i++) {
				for (let j = 0; j < this.cols; j++) {
					this.$watch(
						function() {
							return this.grid[i][j];
						},
						this.nodeWatcher,
						{ deep: true }
					);
				}
			}
		},

		createNode(row, col) {
			let faces = {};
			let faceIndex = row * 2 * this.cols + col * 2;
			faces[1] = this.ground.geometry.faces[faceIndex];
			faceIndex = faceIndex % 2 == 0 ? faceIndex + 1 : faceIndex - 1;
			faces[2] = this.ground.geometry.faces[faceIndex];

			let status = "default";
			if(row == this.start.row && col == this.start.col) {
				status = "start";
			} else if(row == this.finish.row && col == this.finish.col) {
				status = "finish";
			}

			// Node info
			let node = {
				row: row,
				col: col,
				faces: faces,
				status: status,
				distance: Infinity,
				totalDistance: Infinity,
				heuristicDistance: null,
				direction: null,
				weight: 0,
				previousNode: null,
			};

			if (status == "start") {
				tweenToColor(node, this.ground.geometry, this.colors.start);
			} else if (status == "finish") {
				tweenToColor(node, this.ground.geometry, this.colors.finish);
			}

			return node;
		},

		nodeWatcher(newVal, oldVal) {
			// newVal is a node
			// console.log('WATCHER', newVal);
			if (this.visualizerState == "running") return;
			this.updateNode(newVal);
		},

		updateNode(node) {
			let id = node.row * this.cols + node.col;

			if (node.status == "wall") {
				if (this.walls[id] == null) {
					this.addWall(node);
				} else if (!this.walls[id].visible) {
					this.showWall(this.walls[id]);
				}
				// tweenToColor(node, this.ground.geometry, this.colors.wall);
			} else if (node.status == "start") {
				tweenToColor(node, this.ground.geometry, this.colors.start);
			} else if (node.status == "finish") {
				tweenToColor(node, this.ground.geometry, this.colors.finish);
			} else if (node.status == "visited") {
				tweenToColor(node, this.ground.geometry, this.colors.visited);
			} else {
				if (this.walls[id] != null && this.walls[id].visible) {
					this.hideWall(this.walls[id]);
				}
				tweenToColor(node, this.ground.geometry, this.colors.default);
			}
		},

		addWall(node) {
			let vm = this;
			let id = node.row * this.cols + node.col;

			let height = this.nodeDimensions.width * 2 + Math.random() * this.nodeDimensions.width * 3;
			let wallGeomtery = new THREE.BoxBufferGeometry(
				this.nodeDimensions.width,
				height,
				this.nodeDimensions.height
			);

			let wallTextureObject = this.wallTextures[Math.floor(Math.random()*this.wallTextures.length)]
			let loader = new THREE.TextureLoader();
			loader.load(require("@/assets/textures/" + wallTextureObject.path), function(texture) {
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.y = wallTextureObject.repeatY;
				let wallMaterial = new THREE.MeshLambertMaterial({
					// color: new THREE.Color(vm.colors.wall.r, vm.colors.wall.g, vm.colors.wall.b),
					map: texture
				});
				let wall = new THREE.Mesh(wallGeomtery, wallMaterial);
				wall.name = "wall";
				wall.wallId = id;
				wall.castShadow = true;
				wall.receiveShadow = true;
				vm.scene.add(wall);

				let gridWidth = vm.cols * vm.nodeDimensions.width,
					gridHeight = vm.rows * vm.nodeDimensions.height;
				let x = -gridWidth / 2 + vm.nodeDimensions.width / 2 + node.col * vm.nodeDimensions.width,
					y = height / 2,
					z =
						-gridHeight / 2 + vm.nodeDimensions.height / 2 + node.row * vm.nodeDimensions.height;
				wall.position.set(x, height, z);
				new TWEEN.Tween(wall.position)
					.to({ x: x, y: y, z: z }, 1000)
					.easing(TWEEN.Easing.Bounce.Out)
					.onComplete(() => {
						vm.$set(vm.walls, id, wall);
					})
					.start();
			}, undefined, function(error) {
				console.log(error);
			});

		},

		showWall(wall) {
			wall.visible = true;
		},

		hideWall(wall) {
			wall.visible = false;
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
			let mouse = new THREE.Vector2();
			if (this.currentEvent.touches && this.currentEvent.touches.length > 0) {
				mouse.x = (this.currentEvent.touches[0].clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(this.currentEvent.touches[0].clientY / window.innerHeight) * 2 + 1;
			} else {
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			}
			this.raycaster.setFromCamera(mouse, this.camera);
			let intersects = this.raycaster.intersectObjects(this.clickableObjects); //array
			if (intersects.length > 0) {
				let coords;
				if (intersects[0].object.name == "wall") {
					coords = this.faceIndexToCoordinates(intersects[0].object.wallId * 2);
				} else {
					var faceIndex = intersects[0].faceIndex;
					console.log(faceIndex);
					coords = this.faceIndexToCoordinates(faceIndex);
				}
				this.$emit("clickEvent", this.grid[coords.row][coords.col]);
			}
		},

		faceIndexToCoordinates(faceIndex) {
			// As each node has 2 faces
			return {
				row: Math.floor(faceIndex / 2 / this.rows),
				col: Math.floor((faceIndex / 2) % this.cols),
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
