<template>
	<div id="visualizer" @click="controlType == 'PointerLock' ? controls.lock() : null">
		<script type="x-shader/x-vertex" id="vertexShader">
			varying vec3 vWorldPosition;

			void main() {
				vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
				vWorldPosition = worldPosition.xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
		</script>
		<script type="x-shader/x-fragment" id="fragmentShader">
			uniform vec3 topColor;
			uniform vec3 bottomColor;
			uniform float offset;
			uniform float exponent;

			varying vec3 vWorldPosition;

			void main() {
				float h = normalize( vWorldPosition + offset ).y;
				gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
			}
		</script>
	</div>
</template>

<script>
import THREE from "./Utils/ThreeInstance.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import TWEEN, { removeAll } from "@tweenjs/tween.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

import { getAllNodes } from "./algorithms/helpers.js";
import Node from "./Utils/GridNode.js";

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
		"worldSetup",
		"selectedAlgorithm",
		"streaming",
		"thresholdValue"
	],
	data: () => ({
		scene: null,
		camera: null,
		cameraY: 0,
		defaultCameraY: 250,
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
		orbitControls: null,
		pointerLockControls: null,
		clickableObjects: [],
		collidableObjects: [],
		raycaster: null,
		ambientLight: null,
		hemisphereLight: null,
		directionalLight: null,
		ground: null,
		walls: {},
		down: false,
		moved: false,
		currentEvent: null,
		mouse: null,
		prevNode: null,
		clock: null,
		stats: null,
		// Device cam
		videoCanvas: null,
		video: null
	}),

	watch: {
		controlType: function(newVal, oldVal) {
			this.setControls();
		},
		worldSetup: function(newVal, oldVal) {
			if (newVal) {
				TWEEN.removeAll();
				new TWEEN.Tween(this.camera.position)
					.to({ x: 0, y: this.cameraY - 30, z: 0 }, 500)
					.easing(TWEEN.Easing.Exponential.Out)
					.onUpdate(() => {
						this.camera.lookAt(this.scene.position);
					})
					.onComplete(() => {
						this.controls.enableRotate = false;
						let lookDirection = new THREE.Vector3();
						this.camera.getWorldDirection(lookDirection);
						this.controls.target
							.copy(this.camera.position)
							.add(lookDirection.multiplyScalar(this.cameraY - 30));
					})
					.start();
				new TWEEN.Tween(this.camera.rotation)
					.to({ y: 0, z: 0 }, 500)
					.easing(TWEEN.Easing.Exponential.Out)
					.start();
			} else {
				new TWEEN.Tween(this.camera.position)
					.to({ y: this.cameraY }, 500)
					.easing(TWEEN.Easing.Exponential.Out)
					.onComplete(() => {
						this.controls.enableRotate = true;
						this.controls.update();
					})
					.start();
			}
		},
		streaming: function(newVal, oldVal) {
			if(!newVal) {
				for(let i=0; i<this.rows; i++) {
					for(let j=0; j<this.cols; j++) {
						this.grid[i][j].updateNode();
					}
				}
			}
		}
	},

	created() {
		this.cameraY = this.defaultCameraY;
	},

	mounted() {
		this.init();
		
		this.videoCanvas = document.querySelector('#video-canvas');
		this.video = document.querySelector('video');
	},

	methods: {
		init() {
			let width = window.innerWidth,
				height = window.innerHeight;

			//Scene
			THREE.VisualizerInstance.scene = new THREE.Scene();
			this.scene = THREE.VisualizerInstance.scene;
			this.scene.background = new THREE.Color(0xbbd6ff);
			this.scene.fog = new THREE.Fog(0xffffff, 0, 750);

			//Camera
			this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
			this.camera.position.y = this.cameraY + 2000;
			this.camera.position.x = -500;
			this.camera.position.z = 500;
			// var helper = new THREE.CameraHelper(this.camera);
			// this.scene.add(helper);

			//Renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(width, height);
			this.renderer.shadowMap.enabled = true;
			// this.renderer.shadowMap.type = THREE.BasicShadowMap;
			document.getElementById("visualizer").appendChild(this.renderer.domElement);

			// Controls
			this.addControls();
			this.setControls(true);

			// Raycaster
			this.raycaster = new THREE.Raycaster();

			// Ground
			let gridWidth = this.cols * this.nodeDimensions.width,
				gridHeight = this.rows * this.nodeDimensions.height;
			let vm = this;
			let groundGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight, this.cols, this.rows);
			groundGeometry.rotateX(-Math.PI / 2);
			let loader = new THREE.TextureLoader();
			loader.load(
				require("@/assets/textures/ground.png"),
				function(texture) {
					texture.wrapS = THREE.RepeatWrapping;
					texture.wrapT = THREE.RepeatWrapping;
					texture.repeat.x = vm.rows;
					texture.repeat.y = vm.cols;
					var groundMaterial = new THREE.MeshLambertMaterial({
						map: texture,
						side: THREE.FrontSide,
						vertexColors: THREE.FaceColors,
					});
					vm.ground = new THREE.Mesh(groundGeometry, groundMaterial);
					vm.ground.receiveShadow = true;
					vm.ground.position.y = 0.02;
					vm.scene.add(vm.ground);
					THREE.VisualizerInstance.groundId = vm.ground.id;
					vm.initGrid();
					vm.clickableObjects.push(vm.ground);
				},
				undefined,
				function(error) {
					console.log(error);
				}
			);
			let fakeGroundGeometry = new THREE.PlaneGeometry(1000, 1000, this.cols, this.rows);
			fakeGroundGeometry.rotateX(-Math.PI / 2);
			var fakeGroundMaterial = new THREE.MeshLambertMaterial({
				color: 0xBBC2D0,
				side: THREE.FrontSide,
			});
			let fakeGround = new THREE.Mesh(fakeGroundGeometry, fakeGroundMaterial);
			this.scene.add(fakeGround);

			//Grid helper
			var size = this.cols * this.nodeDimensions.height;
			var divisions = this.cols;
			var gridHelper = new THREE.GridHelper(size, divisions, 0x5c78bd, 0x5c78bd);
			gridHelper.position.y = 0.035;
			this.scene.add(gridHelper);

			// Ambient Light
			this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
			this.scene.add(this.ambientLight);

			// LIGHTS
			this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
			this.hemisphereLight.color.setHSL(0.6, 1, 0.6);
			this.hemisphereLight.groundColor.setHex(0x87775d);
			this.hemisphereLight.position.set(0, 5, 0);
			this.scene.add(this.hemisphereLight);

			// let hemiLightHelper = new THREE.HemisphereLightHelper(this.hemisphereLight, 10);
			// this.scene.add(hemiLightHelper);

			this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
			this.directionalLight.color.setHSL(0.1, 1, 0.95);
			this.directionalLight.position.set(-1, 1.75, 1);
			this.directionalLight.position.multiplyScalar(70);
			this.scene.add(this.directionalLight);

			this.directionalLight.castShadow = true;
			this.directionalLight.shadow.mapSize.width = 2048;
			this.directionalLight.shadow.mapSize.height = 2048;

			var d = 200;
			this.directionalLight.shadow.camera.left = -d;
			this.directionalLight.shadow.camera.right = d;
			this.directionalLight.shadow.camera.top = d;
			this.directionalLight.shadow.camera.bottom = -d;
			this.directionalLight.shadow.camera.far = 350;

			// SKYDOME
			var vertexShader = document.getElementById("vertexShader").textContent;
			var fragmentShader = document.getElementById("fragmentShader").textContent;
			var uniforms = {
				topColor: { value: new THREE.Color(0x0077ff) },
				bottomColor: { value: new THREE.Color(0xffffff) },
				offset: { value: 33 },
				exponent: { value: 0.6 },
			};
			uniforms["topColor"].value.copy(this.hemisphereLight.color);

			this.scene.fog.color.copy(uniforms["bottomColor"].value);
			var skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
			var skyMat = new THREE.ShaderMaterial({
				uniforms: uniforms,
				vertexShader: vertexShader,
				fragmentShader: fragmentShader,
				side: THREE.BackSide,
			});
			var sky = new THREE.Mesh(skyGeo, skyMat);
			this.scene.add(sky);

			// Stats
			this.stats = new Stats();
			this.stats.dom.style.top = "auto";
			this.stats.dom.style.bottom = '5px';
			this.stats.dom.style.left = '3px';
			document.getElementById("visualizer").appendChild(this.stats.dom);

			//Resize handler
			window.addEventListener("resize", this.resizeHandler);
			this.renderer.domElement.addEventListener("mousedown", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("touchstart", this.onMouseDown, true);
			this.renderer.domElement.addEventListener("mousemove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("touchmove", this.onMouseMove, true);
			this.renderer.domElement.addEventListener("mouseup", this.onMouseup, true);
			this.renderer.domElement.addEventListener("mouseleave", this.onMouseLeave, true);
			this.renderer.domElement.addEventListener("touchend", this.onMouseup, true);

			// Setting hover handler
			this.mouse = new THREE.Vector2();

			this.renderLoop();
		},

		renderLoop() {
			requestAnimationFrame(this.renderLoop);
			if (this.controlType == "PointerLock") {
				var delta = this.clock.getDelta();
				this.animatePlayer(delta);
			}
			if (this.worldSetup) {
				this.holdAndDragLoop();
				if(this.streaming) {
					this.deviceCamLoop();
				}
			}
			this.renderer.render(this.scene, this.camera);
			TWEEN.update();
			this.stats.update();
		},

		holdAndDragLoop() {
			if (!this.down) {
				this.prevNode = null;
				return;
			}

			this.raycaster.setFromCamera(this.mouse, this.camera);
			var intersects = this.raycaster.intersectObjects(this.clickableObjects);
			if (intersects.length > 0) {
				// Get coordinates of node
				let coords;
				if (intersects[0].object.name == "wall") {
					coords = this.faceIndexToCoordinates(intersects[0].object.wallId * 2);
				} else {
					var faceIndex = intersects[0].faceIndex;
					coords = this.faceIndexToCoordinates(faceIndex);
				}

				// If current hovered is not the previous node
				if (this.grid[coords.row][coords.col] != this.prevNode) {
					let ends = ["start", "finish"];
					const isEndNode = ends.includes(this.grid[coords.row][coords.col].status);
					const isPrevEnd = this.prevNode && ends.includes(this.prevNode.status);

					if (isEndNode || isPrevEnd) {
						let endToUpdate;
						if (isEndNode) {
							endToUpdate = this.grid[coords.row][coords.col].status;
						} else {
							endToUpdate = this.prevNode.status;
						}
						let coordsToUpdate = {};
						coordsToUpdate[endToUpdate] = {
							row: coords.row,
							col: coords.col,
						}
						if (isPrevEnd) {
							this.prevNode.status = "default";
						}
						this.grid[coords.row][coords.col].status = endToUpdate;
						this.$emit("updateEnds", coordsToUpdate);
					// Else if prev is not an end and algorithm is not unweighted
					} else if (!isPrevEnd && this.selectedAlgorithm.type != 'unweighted') {
						this.grid[coords.row][coords.col].status =
							this.grid[coords.row][coords.col].status == "wall" ? "default" : "wall";
					}

					this.prevNode = this.grid[coords.row][coords.col];
				}
			}
		},

		animatePlayer(delta) {
			let playerSpeed = 300;
			// Gradual slowdown
			this.pointerLock.velocity.x -= this.pointerLock.velocity.x * 10.0 * delta;
			this.pointerLock.velocity.z -= this.pointerLock.velocity.z * 10.0 * delta;

			if (this.detectPlayerCollision() == false) {
				this.pointerLock.direction.z =
					Number(this.pointerLock.moveForward) - Number(this.pointerLock.moveBackward);
				this.pointerLock.direction.x =
					Number(this.pointerLock.moveRight) - Number(this.pointerLock.moveLeft);
				this.pointerLock.direction.normalize(); // this ensures consistent movements in all directions
	
				if (this.pointerLock.moveForward || this.pointerLock.moveBackward)
					this.pointerLock.velocity.z -= this.pointerLock.direction.z * playerSpeed * delta;
				if (this.pointerLock.moveLeft || this.pointerLock.moveRight)
					this.pointerLock.velocity.x -= this.pointerLock.direction.x * playerSpeed * delta;
	
				this.controls.moveRight(-this.pointerLock.velocity.x * delta);
				this.controls.moveForward(-this.pointerLock.velocity.z * delta);
			} else {
				this.pointerLock.velocity.x = 0;
				this.pointerLock.velocity.z = 0;
			}

			this.pointerLock.velocity.y -= 9.8 * 50.0 * delta; // 50.0 = mass
			if(this.detectOnObject()) {
				this.pointerLock.velocity.y = Math.max(0, this.pointerLock.velocity.y);
				this.pointerLock.canJump = true;
			}
			this.controls.getObject().position.y += this.pointerLock.velocity.y * delta;

			if (this.controls.getObject().position.y < this.cameraY) {
				this.pointerLock.velocity.y = 0;
				this.controls.getObject().position.y = this.cameraY;
				this.pointerLock.canJump = true;
			}
		},

		detectPlayerCollision() {
			let rotationMatrix;
			// Get direction of camera
			let cameraDirection = this.controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();
			let collisionDistance = 1;

			// Check which direction we're moving (not looking)
			// Flip matrix to that direction so that we can reposition the ray
			if (this.pointerLock.moveBackward) {
				rotationMatrix = new THREE.Matrix4();
				rotationMatrix.makeRotationY(this.degreesToRadians(180));
			} else if (this.pointerLock.moveLeft) {
				rotationMatrix = new THREE.Matrix4();
				rotationMatrix.makeRotationY(this.degreesToRadians(90));
			} else if (this.pointerLock.moveRight) {
				rotationMatrix = new THREE.Matrix4();
				rotationMatrix.makeRotationY(this.degreesToRadians(270));
			}

			// Player is not moving forward, apply the needed rotation matrix
			if (rotationMatrix !== undefined) {
				cameraDirection.applyMatrix4(rotationMatrix);
			}

			// Apply ray to player camera
			let rayCaster = new THREE.Raycaster(this.controls.getObject().position, cameraDirection);

			// If our ray hit a collidable object, return true
			if (this.rayIntersect(rayCaster, collisionDistance)) {
				return true;
			} else {
				return false;
			}
		},

		detectOnObject() {
			let collisionDistance = this.cameraY+1;
			let rayCaster = new THREE.Raycaster(this.controls.getObject().position, new THREE.Vector3(0, -1, 0));
			// rayCaster.ray.origin.y -= this.cameraY;
			if (this.rayIntersect(rayCaster, collisionDistance)) {
				return true;
			} else {
				return false;
			}
		},

		deviceCamLoop() {
			let videoCtx = this.videoCanvas.getContext("2d");

			videoCtx.drawImage(this.video, 0, 0, this.videoCanvas.width, this.videoCanvas.height);
			let pixels = videoCtx.getImageData(0, 0, this.videoCanvas.width, this.videoCanvas.height);
			for(let y=0; y<this.videoCanvas.height; y++) {
				for(let x=0; x<this.videoCanvas.width; x++) {
					let index = (x + y * this.videoCanvas.width) * 4;
					let r = pixels.data[index+0];
					let g = pixels.data[index+1];
					let b = pixels.data[index+2];
					
					let brightness = Math.floor((r+g+b)/3);
					let gridX = Math.floor(this.videoCanvas.width-1-x);
					let status = "default";
					if (y == this.start.row && gridX == this.start.col) {
						status = "start";
					} else if (y == this.finish.row && gridX == this.finish.col) {
						status = "finish";
					}
					if(brightness > this.thresholdValue) {
						this.grid[y][gridX].status = status;
					} else if(status != 'start' && status != 'finish') {
						this.grid[y][gridX].status = 'wall';
					}
				}
			}
		},

		rayIntersect(ray, distance) {
			var intersects = ray.intersectObjects(this.collidableObjects);
			for (var i = 0; i < intersects.length; i++) {
				// Check if there's a collision
				if (intersects[i].distance < distance) {
					return true;
				}
			}
			return false;
		},

		addControls() {
			this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
			this.pointerLockControls = new PointerLockControls(this.camera, this.renderer.domElement);
			this.pointerLockControls.addEventListener("lock", function() {
				console.log("Pointer Locked");
			});
			this.pointerLockControls.addEventListener("unlock", function() {
				console.log("Pointer Unlocked");
			});
			// Clock
			this.clock = new THREE.Clock();
			document.addEventListener("keydown", this.onKeyDown, false);
			document.addEventListener("keyup", this.onKeyUp, false);
			this.pointerLock.velocity = new THREE.Vector3();
			this.pointerLock.direction = new THREE.Vector3();
			this.scene.add(this.pointerLockControls.getObject());
		},

		setControls(fromInit = false) {
			let vm = this;
			TWEEN.removeAll();
			if (this.controlType == "Orbit") {
				// OrbitControls
				this.cameraY = this.defaultCameraY;
				this.camera.near = 1;
				this.camera.updateProjectionMatrix();
				this.controls = this.orbitControls;
				this.controls.enabled = true;
				setTimeout(() => {
					vm.resetCamera();
				}, fromInit ? 800 : 0);
			} else if (this.controlType == "PointerLock") {
				// PointerLock controls
				this.cameraY = 3;
				this.camera.near = 0.05;
				this.camera.updateProjectionMatrix();
				this.controls.enabled = false;
				this.controls = this.pointerLockControls;
				let startPosition = this.ground.geometry.vertices[
					this.grid[this.start.row][this.start.col].faces[1]["a"]
				];
				new TWEEN.Tween(this.camera.position)
					.to(startPosition, 2000)
					.easing(TWEEN.Easing.Exponential.Out)
					.start();
				new TWEEN.Tween(this.camera.rotation)
					.to({ x: 0, y: (5 * Math.PI) / 4, z: 0 }, 2000)
					.easing(TWEEN.Easing.Exponential.Out)
					.start();
			}
		},

		resetCamera() {
			new TWEEN.Tween(this.camera.position)
				.to({ x: 0, y: this.cameraY, z: 0 }, 2000)
				.easing(TWEEN.Easing.Exponential.Out)
				.onUpdate(() => {
					this.camera.lookAt(this.scene.position);
				})
				.onComplete(() => {
					let lookDirection = new THREE.Vector3();
					this.camera.getWorldDirection(lookDirection);
					this.controls.target
						.copy(this.camera.position)
						.add(lookDirection.multiplyScalar(this.cameraY));
				})
				.start();
			new TWEEN.Tween(this.camera.rotation)
				.to({ x: -Math.PI / 2, y: 0, z: 0 }, 2000)
				.easing(TWEEN.Easing.Exponential.Out)
				.start();
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
						{ deep: true, immediate: true }
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
			if (row == this.start.row && col == this.start.col) {
				status = "start";
			} else if (row == this.finish.row && col == this.finish.col) {
				status = "finish";
			}

			// New Node object
			let node = new Node(row, col, faces, status);

			return node;
		},

		nodeWatcher(newVal, oldVal) {
			if (this.visualizerState == "running") return;
			newVal.updateNode(this.streaming);
			this.computeInteractableObjects(newVal);
		},

		computeInteractableObjects(node) {
			let index;
			const wall = this.scene.getObjectById(node.wallMeshId);
			if(node.status == "wall") {
				index = this.clickableObjects.indexOf(wall);
				if(index == -1) {
					this.clickableObjects.push(wall);
				}
				index = this.collidableObjects.indexOf(wall);
				if(index == -1) {
					this.collidableObjects.push(wall);
				}
			} else {
				index = this.clickableObjects.indexOf(wall);
				if(index != -1) {
					this.clickableObjects.splice(index, 1);
				}
				index = this.collidableObjects.indexOf(wall);
				if(index != -1) {
					this.collidableObjects.splice(index, 1);
				}
			}
		},

		onMouseDown(event) {
			this.down = true;
			this.moved = false;
			this.currentEvent = event;
			this.setMouseVector(event, "move");
		},
		onMouseMove(event) {
			if (!this.down) return;
			this.moved = true;
			if (this.worldSetup) {
				this.setMouseVector(event, "move");
			}
		},
		onMouseLeave() {
			if (this.moved) {
				this.onMouseup();
			}
			this.down = false;
		},
		onMouseup(event) {
			let threshold = 25;
			if (this.moved) {
				let dist = 0;
				if (this.currentEvent.touches && this.currentEvent.touches.length > 0) {
					dist = this.calcDist(
						this.currentEvent.touches[0].pageX - event.changedTouches[0].pageX,
						this.currentEvent.touches[0].pageY - event.changedTouches[0].pageY
					);
					dist > threshold ? this.moveHandler(event) : this.clickHandler(event);
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

		calcDist(x, y) {
			return x * x + y * y;
		},

		setMouseVector(event, type) {
			let touchEvent = type == "click" ? this.currentEvent : event;
			if (touchEvent.touches && touchEvent.touches.length > 0) {
				this.mouse.x = (touchEvent.touches[0].clientX / window.innerWidth) * 2 - 1;
				this.mouse.y = -(touchEvent.touches[0].clientY / window.innerHeight) * 2 + 1;
			} else {
				this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			}
		},

		moveHandler(event) {
			// console.log("Moved");
		},

		clickHandler(event) {
			if (this.worldSetup || this.controlType == "PointerLock") return;
			this.setMouseVector(event, "click");
			this.raycaster.setFromCamera(this.mouse, this.camera);
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

		degreesToRadians(degrees) {
			return degrees * Math.PI/180;
		},

		faceIndexToCoordinates(faceIndex) {
			// As each node has 2 faces
			return {
				row: Math.floor((faceIndex / 2) / this.cols),
				col: Math.floor((faceIndex / 2) % this.cols),
			};
		},

		onKeyDown(event) {
			if (this.controlType == "Orbit") {
				switch (event.keyCode) {
					// case 72:  // h
					// 	this.hemisphereLight.visible = !this.hemisphereLight.visible;
					// 	break;
					// case 68: // d
					// 	this.directionalLight.visible = !this.directionalLight.visible;
					// 	break;
					case 87: // w
						this.$emit('switchWorldSetup');
						break;
					case 80: // p
						this.$emit('switchControlType');
						break;
				}
			} else {
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
						if (this.pointerLock.canJump === true) this.pointerLock.velocity.y += 200;
						this.pointerLock.canJump = false;
						break;
					case 80: // P
						if(!this.controls.isLocked) {
							this.$emit('switchControlType');
						}
						break;
				}
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
		}
	}
};
</script>

<style lang="scss">
#visualizer {
	height: 100vh;
	width: 100vw;
}
</style>
