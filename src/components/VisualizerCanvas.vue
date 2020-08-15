<template>
	<div id="visualizer" @click="controlType == 'PointerLock' ? controls.lock() : clearFocus">
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
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import TWEEN, { removeAll } from "@tweenjs/tween.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

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
		"worldSetup",
	],
	data: () => ({
		scene: null,
		camera: null,
		cameraY: 0,
		defaultCameraY: 350,
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
		raycaster: null,
		ambientLight: null,
		hemisphereLight: null,
		directionalLight: null,
		ground: null,
		wallGeomtery: null,
		wallMaterials: [],
		walls: {},
		wallTextures: [
			{
				path: "building1.png",
				repeatY: 1,
			},
			{
				path: "building2.png",
				repeatY: 1,
			},
			{
				path: "building4.png",
				repeatY: 3,
			},
		],
		down: false,
		moved: false,
		currentEvent: null,
		mouse: null,
		intersectedNode: null,
		clock: null,
		stats: null,
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
		collidableObjects() {
			let objects = [];
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
		worldSetup: function(newVal, oldVal) {
			if (newVal) {
				new TWEEN.Tween(this.camera.position)
					.to({ x: 0, y: this.cameraY - 10, z: 0 }, 500)
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
							.add(lookDirection.multiplyScalar(this.cameraY - 10));
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
	},
	created() {
		this.cameraY = this.defaultCameraY;
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
			this.scene.background = new THREE.Color(0xbbd6ff);
			this.scene.fog = new THREE.Fog(0xffffff, 0, 1000);

			//Camera
			this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
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
			this.setControls();

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
				require("@/assets/textures/ground-bricks.png"),
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
					vm.ground.position.y = 0.01;
					vm.scene.add(vm.ground);
					vm.initGrid();
					vm.$emit("groundInitialized", vm.ground);
				},
				undefined,
				function(error) {
					console.log(error);
				}
			);
			let fakeGroundGeometry = new THREE.PlaneGeometry(1000, 1000, this.cols, this.rows);
			fakeGroundGeometry.rotateX(-Math.PI / 2);
			var fakeGroundMaterial = new THREE.MeshLambertMaterial({
				// color: 0x87775d,
				color: 0xb1b5cc,
				side: THREE.FrontSide,
			});
			let fakeGround = new THREE.Mesh(fakeGroundGeometry, fakeGroundMaterial);
			this.scene.add(fakeGround);

			//Grid helper
			var size = this.cols * this.nodeDimensions.height;
			var divisions = this.cols;
			var gridHelper = new THREE.GridHelper(size, divisions, 0x636b4c, 0x636b4c);
			gridHelper.position.y = 0.02;
			this.scene.add(gridHelper);

			// Wall
			// let wallHeight = this.nodeDimensions.width * 2 + Math.random() * this.nodeDimensions.width * 3;
			let wallHeight = this.nodeDimensions.height * 2;
			this.wallGeomtery = new THREE.BoxBufferGeometry(
				this.nodeDimensions.width,
				wallHeight,
				this.nodeDimensions.height
			);
			let wallTextureObject = this.wallTextures[
				Math.floor(Math.random() * this.wallTextures.length)
			];
			this.wallMaterials.push(
				new THREE.MeshPhongMaterial({
					color: new THREE.Color(this.colors.wall.r, this.colors.wall.g, this.colors.wall.b),
				})
			);
			for (let tex of this.wallTextures) {
				loader.load(
					require("@/assets/textures/" + tex.path),
					function(texture) {
						texture.wrapT = THREE.RepeatWrapping;
						texture.repeat.y = tex.repeatY;
						vm.wallMaterials.push(new THREE.MeshLambertMaterial({ map: texture }));
					},
					undefined,
					function(error) {
						console.log(error);
					}
				);
			}

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

			// let dirLightHeper = new THREE.DirectionalLightHelper( this.directionalLight, 10 );
			// this.scene.add( dirLightHeper );
			// var shadowHelper = new THREE.CameraHelper( this.directionalLight.shadow.camera );
			// this.scene.add(shadowHelper)

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
			this.stats.dom.style.bottom = 0;
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

			this.gameLoop();
		},

		gameLoop() {
			requestAnimationFrame(this.gameLoop);
			if (this.controlType == "PointerLock") {
				var delta = this.clock.getDelta();
				this.animatePlayer(delta);
				// this.pointerLockLoop(delta);
			}
			if (this.worldSetup) {
				this.hoverObjectLoop();
			}
			this.renderer.render(this.scene, this.camera);
			TWEEN.update();
			this.stats.update();
		},

		hoverObjectLoop() {
			if (!this.down) {
				this.intersectedNode = null;
				return;
			}
			this.raycaster.setFromCamera(this.mouse, this.camera);
			var intersects = this.raycaster.intersectObjects(this.clickableObjects);
			if (intersects.length > 0) {
				let coords;
				if (intersects[0].object.name == "wall") {
					coords = this.faceIndexToCoordinates(intersects[0].object.wallId * 2);
				} else {
					var faceIndex = intersects[0].faceIndex;
					coords = this.faceIndexToCoordinates(faceIndex);
				}

				if (this.grid[coords.row][coords.col] != this.intersectedNode) {
					let ends = ["start", "finish"];
					if (
						ends.includes(this.grid[coords.row][coords.col].status) ||
						(this.intersectedNode && ends.includes(this.intersectedNode.status))
					) {
						let end;
						if (ends.includes(this.grid[coords.row][coords.col].status)) {
							end = this.grid[coords.row][coords.col].status;
						} else {
							end = this.intersectedNode.status;
						}
						let obj = {};
						obj[end] = {
							row: coords.row,
							col: coords.col,
						};
						if (this.intersectedNode && ends.includes(this.intersectedNode.status)) {
							this.intersectedNode.status = "default";
						}
						this.grid[coords.row][coords.col].status = end;
						this.$emit("updateEnds", obj);
					} else if (!this.intersectedNode || !ends.includes(this.intersectedNode.status)) {
						// if (this.intersectedNode) {
						// 	this.intersectedNode.status = "default";
						// }
						this.grid[coords.row][coords.col].status =
							this.grid[coords.row][coords.col].status == "wall" ? "default" : "wall";
					}

					this.intersectedNode = this.grid[coords.row][coords.col];
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

			this.pointerLock.velocity.y -= 9.8 * 80.0 * delta; // 80.0 = mass
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
			// The rotation matrix to apply to our direction vector
			// Undefined by default to indicate ray should coming from front
			let rotationMatrix;
			// Get direction of camera
			let cameraDirection = this.controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();
			let collisionDistance = 4;

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

			// Player is not moving forward, apply rotation matrix needed
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
			let collisionDistance = 4;
			let rayCaster = new THREE.Raycaster(this.controls.getObject().position, new THREE.Vector3(0, -1, 0));
			if (this.rayIntersect(rayCaster, collisionDistance)) {
				return true;
			} else {
				return false;
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

		setControls() {
			let vm = this;
			TWEEN.removeAll();
			if (this.controlType == "Orbit") {
				// OrbitControls
				this.cameraY = this.defaultCameraY;
				this.controls = this.orbitControls;
				this.controls.enabled = true;
				setTimeout(() => {
					vm.resetCamera();
				}, 0);
			} else if (this.controlType == "PointerLock") {
				// PointerLock controls
				this.cameraY = 2;
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
			if (row == this.start.row && col == this.start.col) {
				status = "start";
			} else if (row == this.finish.row && col == this.finish.col) {
				status = "finish";
			}

			// Node info
			let node = {
				id: row * this.cols + col,
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
				tweenToColor(node, this.ground.geometry, [this.colors.start]);
			} else if (status == "finish") {
				tweenToColor(node, this.ground.geometry, [this.colors.finish]);
			}

			return node;
		},

		nodeWatcher(newVal, oldVal) {
			// console.log('WATCHER', newVal);
			if (this.visualizerState == "running") return;
			this.updateNode(newVal);
		},

		updateNode(node) {
			if (node.status == "wall") {
				if (this.walls[node.id] == null) {
					this.addWall(node);
				} else if (!this.walls[node.id].visible) {
					this.showWall(this.walls[node.id]);
				}
				tweenToColor(node, this.ground.geometry, [this.colors.wall]);
			} else if (node.status == "start") {
				tweenToColor(node, this.ground.geometry, [this.colors.start]);
			} else if (node.status == "finish") {
				tweenToColor(node, this.ground.geometry, [this.colors.finish]);
			} else if (node.status == "visited") {
				tweenToColor(node, this.ground.geometry, [this.colors.visited]);
			} else {
				if (this.walls[node.id] != null && this.walls[node.id].visible) {
					this.hideWall(this.walls[node.id]);
				}
				tweenToColor(node, this.ground.geometry, [this.colors.default]);
			}
		},

		addWall(node) {
			let materialId = 1 + Math.floor(Math.random() * (this.wallMaterials.length - 1));
			let scaleY = 0.5 + Math.random();

			let wall = new THREE.Mesh(this.wallGeomtery, this.wallMaterials[materialId]);
			wall.name = "wall";
			wall.wallId = node.id;
			wall.scale.y = scaleY;
			wall.castShadow = true;
			wall.receiveShadow = true;
			this.scene.add(wall);
			this.$set(this.walls, node.id, wall);

			let gridWidth = this.cols * this.nodeDimensions.width;
			let gridHeight = this.rows * this.nodeDimensions.height;
			let height = this.wallGeomtery.parameters.height * wall.scale.y;
			let x = -gridWidth / 2 + this.nodeDimensions.width / 2 + node.col * this.nodeDimensions.width,
				y = height / 2,
				z =
					-gridHeight / 2 + this.nodeDimensions.height / 2 + node.row * this.nodeDimensions.height;
			wall.position.set(x, height, z);
			new TWEEN.Tween(wall.position)
				.to({ x: x, y: y, z: z }, 1000)
				.easing(TWEEN.Easing.Bounce.Out)
				.start();
		},

		showWall(wall) {
			let height = wall.geometry.parameters.height * wall.scale.y;
			wall.visible = true;
			wall.position.setY(height);
			new TWEEN.Tween(wall.position)
				.to({ y: height / 2 }, 1000)
				.easing(TWEEN.Easing.Bounce.Out)
				.start();
		},

		hideWall(wall) {
			wall.visible = false;
		},

		onMouseDown(event) {
			this.down = true;
			this.moved = false;
			this.currentEvent = event;
			this.setMouseVector(event, "move");
			this.clearFocus();
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
			console.log("Moved");
			// let vm = this;
			// let mouse = new THREE.Vector2();
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
				row: Math.floor(faceIndex / 2 / this.rows),
				col: Math.floor((faceIndex / 2) % this.cols),
			};
		},

		clearFocus() {
			document.getElementsByClassName("header")[0].click();
		},

		onKeyDown(event) {
			if (this.controlType == "Orbit") {
				switch (event.keyCode) {
					case 72:
						this.hemisphereLight.visible = !this.hemisphereLight.visible;
						break;
					case 68:
						this.directionalLight.visible = !this.directionalLight.visible;
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
						if (this.pointerLock.canJump === true) this.pointerLock.velocity.y += 300;
						this.pointerLock.canJump = false;
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
