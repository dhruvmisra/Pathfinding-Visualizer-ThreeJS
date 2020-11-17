import THREE from "./ThreeInstance.js";
import CONFIG from "../config.js";
import TWEEN from "@tweenjs/tween.js";

// WALLS
const wallTextures = [
	{
		path: "building1.png",
		repeatY: 1,
	},
	{
		path: "building2.png",
		repeatY: 2,
	},
	{
		path: "building3.png",
		repeatY: 3,
	},
]

// let wallHeight = CONFIG.NODEDIMENSIONS.width * 2 + Math.random() * CONFIG.NODEDIMENSIONS.width * 3;
let wallHeight = CONFIG.NODEDIMENSIONS.height * 2;
const wallGeomtery = new THREE.BoxBufferGeometry(
	CONFIG.NODEDIMENSIONS.width,
	wallHeight,
	CONFIG.NODEDIMENSIONS.height
);

let wallMaterials = [];
wallMaterials.push(
	new THREE.MeshPhongMaterial({
		color: new THREE.Color(CONFIG.COLORS.wall.r, CONFIG.COLORS.wall.g, CONFIG.COLORS.wall.b),
	})
);

const loader = new THREE.TextureLoader();
for (let tex of wallTextures) {
	loader.load(
		require("@/assets/textures/" + tex.path),
		function(texture) {
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.y = tex.repeatY;
			wallMaterials.push(new THREE.MeshLambertMaterial({ map: texture }));
		},
		undefined,
		function(error) {
			console.log(error);
		}
	);
}


export default class Node {
	constructor(row, col, faces, status) {
		this.id = row * CONFIG.COLS + col;
		this.row = row;
		this.col = col;
		this.faces = faces;
		this.status = status;
		this.distance = Infinity;
		this.totalDistance = Infinity;
		this.heuristicDistance = null;
		this.direction = null;
		this.weight = 0;
		this.previousNode = null;
		this.wallMeshId = null;
	}

	updateNode(instant = false) {
		switch(this.status) {
			case "wall":
				let scaleY = 0.5 + Math.random();
				if (this.wallMeshId != null) {
					let wallVisible = THREE.VisualizerInstance.scene.getObjectById(this.wallMeshId).visible;
					if(!wallVisible) {
						this.showWall(scaleY, instant ? 0 : 1000);
						this.tweenToColor([CONFIG.COLORS.wall]);
					}
				} else {
					this.addWall(scaleY, instant ? 0 : 1000);
					this.tweenToColor([CONFIG.COLORS.wall]);
				}
				break;
			
			case "start":
				this.tweenToColor([CONFIG.COLORS.start]);
				break;
			
			case "finish":
				this.tweenToColor([CONFIG.COLORS.finish]);
				break;

			case "visited":
				this.tweenToColor([CONFIG.COLORS.visited]);
				break;

			default:
				let wallVisible = this.wallMeshId != null && THREE.VisualizerInstance.scene.getObjectById(this.wallMeshId).visible;
				if (wallVisible && !instant) {
					this.hideWall();
				}
				this.tweenToColor([CONFIG.COLORS.default]);
		}
	}

	addWall(scaleY, duration) {
		let materialId = 1 + Math.floor(Math.random() * (wallMaterials.length - 1));
		let wall = new THREE.Mesh(wallGeomtery, wallMaterials[materialId]);
		wall.name = "wall";
		wall.wallId = this.id;
		wall.scale.y = scaleY;
		wall.castShadow = true;
		wall.receiveShadow = true;
		THREE.VisualizerInstance.scene.add(wall);
		this.wallMeshId = wall.id;

		let gridWidth = CONFIG.COLS * CONFIG.NODEDIMENSIONS.width;
		let gridHeight = CONFIG.ROWS * CONFIG.NODEDIMENSIONS.height;
		let height = wallGeomtery.parameters.height * wall.scale.y;
		let x = -gridWidth / 2 + CONFIG.NODEDIMENSIONS.width / 2 + this.col * CONFIG.NODEDIMENSIONS.width,
			y = height / 2,
			z =
				-gridHeight / 2 + CONFIG.NODEDIMENSIONS.height / 2 + this.row * CONFIG.NODEDIMENSIONS.height;
		
		if(duration == 0) {
			wall.position.set(x, y, z);
		} else {
			wall.position.set(x, height, z);
			new TWEEN.Tween(wall.position)
				.to({ x: x, y: y, z: z }, duration)
				.easing(TWEEN.Easing.Bounce.Out)
				.start();
		}
	}

	showWall(scaleY, duration) {
		let wall = THREE.VisualizerInstance.scene.getObjectById(this.wallMeshId);

		wall.scale.y = scaleY;
		let height = wall.geometry.parameters.height * wall.scale.y;
		wall.visible = true;
		if(duration == 0) {
			wall.position.setY(height/2);
		} else {
			wall.position.setY(height);
			new TWEEN.Tween(wall.position)
				.to({ y: height / 2 }, duration)
				.easing(TWEEN.Easing.Bounce.Out)
				.start();
		}
	}

	hideWall() {
		THREE.VisualizerInstance.scene.getObjectById(this.wallMeshId).visible = false;
	}

	
	tweenToColor(colors, duration = 300, options) {
		let groundId = THREE.VisualizerInstance.groundId;
		let geometry = THREE.VisualizerInstance.scene.getObjectById(groundId).geometry;

		for(let i=0; i<colors.length; i++) {
			new TWEEN.Tween(this.faces[1].color)
				.to(colors[i], duration)
				.onUpdate(() => {
					geometry.colorsNeedUpdate = true;
				})
				.delay(i*200)
				.start();
			new TWEEN.Tween(this.faces[2].color)
				.to(colors[i], duration)
				.onUpdate(() => {
					geometry.colorsNeedUpdate = true;
				})
				.delay(i*200)
				.start();
		}

		if (options) {
			if (options.position) {
				var facesIndices = ["a", "b", "c"];
				facesIndices.forEach(function (indices) {
					new TWEEN.Tween(geometry.vertices[this.faces[1][indices]])
						.to({ y: 0.5 }, duration)
						.onUpdate(() => {
							geometry.verticesNeedUpdate = true;
						})
						.start();
					new TWEEN.Tween(geometry.vertices[this.faces[2][indices]])
						.to({ y: 0.5 }, duration)
						.onUpdate(() => {
							geometry.verticesNeedUpdate = true;
						})
						.start();
				});
				facesIndices.forEach(function (indices) {
					new TWEEN.Tween(geometry.vertices[this.faces[1][indices]])
						.to({ y: 0 }, duration)
						.onUpdate(() => {
							geometry.verticesNeedUpdate = true;
						})
						.delay(100)
						.start();
					new TWEEN.Tween(geometry.vertices[this.faces[2][indices]])
						.to({ y: 0 }, duration)
						.onUpdate(() => {
							geometry.verticesNeedUpdate = true;
						})
						.delay(100)
						.start();
				});
			}
		}
	}
}


