<template>
	<div class="interaction-ui">
		<transition-group name="slide" mode="out-in" tag="div" class="header py-1">
			<select
				id="algorithms"
				v-model="localSelectedAlgorithm"
				:disabled="visualizerState == 'running'"
				key="algo-select"
				v-if="!worldSetup"
			>
				<option 
					:value="algo" 
					v-for="algo in algorithms" 
					:key="algo.algorithm" 
				>{{ algo.displayName }}</option>
			</select>
			
			<Button
				class="accent"
				:disabled="visualizerState == 'running' || worldSetup"
				key="visualize"
				v-if="!worldSetup"
				@click="$emit('visualize-algorithm')"
			>
				<img class="fallback-icon" src="@/assets/icons/path.svg" alt="" />
				<span class="lg">Visualize!</span>
			</Button>
			<Button
				class="danger"
				key="clear-path"
				:disabled="visualizerState == 'running'"
				@click="$emit('clear-path')"
			>
				<img class="fallback-icon" src="@/assets/icons/cross.svg" alt="" />
				<span class="lg">Clear path</span>
				<span class="sm">path</span>
			</Button>
			<Button
				class="danger"
				key="clear-walls"
				:disabled="visualizerState == 'running'"
				@click="$emit('clear-walls')"
			>
				<img class="fallback-icon" src="@/assets/icons/cross.svg" alt="" />
				<span class="lg">Clear walls</span>
				<span class="sm">walls</span>
			</Button>
			<div class="maze-dropdown" key="maze-select">
				<Button class="info btn-maze" :disabled="visualizerState == 'running'" @click="$emit('maze-dropdown-clicked')">
					<img class="fallback-icon" src="@/assets/icons/maze.svg" alt="" />
					<span class="lg">Maze Algorithms</span>
				</Button>
				<div class="dropdown" v-if="dropdownOpen">
					<div
						class="dropdown-item"
						v-for="algo in mazeAlgorithms"
						:key="algo"
						@click="$emit('generate-maze', algo)"
					>
						{{ algo }}
					</div>
				</div>
			</div>
			<select
				id="algorithms"
				v-model="localSelectedSpeed"
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
			@click="$emit('update:worldSetup', !worldSetup)"
		>
			<img src="@/assets/icons/setup.svg" alt="" />
			<span class="lg">{{ worldSetup ? "Complete Setup" : "Setup World" }}</span>
		</Button>
		<Button
			class="hover btn-controls warning"
			key="switch-controls"
			v-if="!worldSetup"
			@click="$emit('switch-control')"
		>
			<img src="@/assets/icons/street-view.svg" alt="" v-if="controlType == 'Orbit'" />
			<img src="@/assets/icons/perspective.svg" alt="" v-else />
			<span class="lg">{{ controlType == "Orbit" ? "First-person" : "Perspective" }}</span>
		</Button>
		<Button
			class="hover btn-camera warning"
			key="reset-camera"
			v-if="controlType == 'Orbit'"
			@click="$emit('reset-camera')"
		>
			<img src="@/assets/icons/reset-camera.svg" alt="" />
			<span class="lg">Reset Camera</span>
		</Button>
		<Button
			class="hover btn-device-cam warning"
			:class="{ active: deviceCamInput }"
			key="device-camera"
			v-if="worldSetup"
			@click="$emit('update:deviceCamInput', !deviceCamInput)"
		>
			<img src="@/assets/icons/camera.svg" alt="" />
			<span class="lg">{{ "Device Input" }}</span>
		</Button>
	</div>
</template>

<script>
export default {
	props: [
		"visualizerState",
		"controlType",
		"worldSetup",
		"algorithms",
		"selectedAlgorithm",
		"mazeAlgorithms",
		"deviceCamInput",
		"speeds",
		"selectedSpeed",
		"dropdownOpen"
	],
	computed: {
		localSelectedAlgorithm: {
			get() { 
				return this.selectedAlgorithm;
			},
			set(newAlgo) {
				this.$emit('update:selectedAlgorithm', newAlgo);
			}
		},
		localSelectedSpeed: {
			get() { 
				return this.selectedSpeed;
			},
			set(newSpeed) {
				this.$emit('update:selectedSpeed', newSpeed);
			}
		}
	}
}
</script>

<style lang="scss">
@import "@/scss/variables.scss";

.interaction-ui {
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