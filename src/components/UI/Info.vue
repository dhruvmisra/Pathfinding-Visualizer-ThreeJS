<template>
	<div class="info-container" ref="infoBox" :class="{ ...status, centered: status == 'tutorial' || status == 'attributions' }">
		<button class="btn-close" @click="status = ''" v-if="status != ''">&#10006;</button>
		<h2>{{ current.heading }}</h2>
		<p v-html="current.text"></p>
		<div class="info-buttons">
			<Button class="info" @click="showTutorial" v-if="status != 'tutorial'">Tutorial</Button>
			<Button @click="showAttributions" v-if="status != 'tutorial'">Attributions</Button>
			<!-- Tutorial buttons -->
			<Button class="danger btn-tutorial" v-if="status == 'tutorial'">Skip</Button>
			<div class="btn-group">
				<Button class="info btn-tutorial" v-if="status == 'tutorial'" :disabled="tutorialIndex == 0" @click="tutorialIndex--">Prev</Button>
				<Button class="info btn-tutorial" v-if="status == 'tutorial'" :disabled="tutorialIndex == tutorial.length-1" @click="tutorialIndex++">Next</Button>
			</div>
		</div>
		<img class="info-icon" src="@/assets/icons/info.svg">
	</div>
</template>

<script>
export default {
	props: {
		info: Object
	},
	data: () => ({
		status: '',
		current: {
			heading: "",
			text: ""
		},
		tutorial: [
			{
				heading: "Pathfinding Visualizer in 3D!",
				text: "This is the 3D visualizer of multiple pathfinding algorithms. <br> A pathfinding algorithm seeks to find the shortest path between two points. <br><br> All of the algorithms on this web-app are adapted for a 2D grid, where 90 degree turns have a cost of 1 and movements from a node to another have a cost of 1."
			},
			{
				heading: "Pathfinding Visualizer in 3D! 2",
				text: "This is the 3D visualizer of multiple pathfinding algorithms. <br> A pathfinding algorithm seeks to find the shortest path between two points. <br><br> All of the algorithms on this web-app are adapted for a 2D grid, where 90 degree turns have a cost of 1 and movements from a node to another have a cost of 1."
			},
		],
		tutorialIndex: 0,
	}),
	watch: {
		tutorialIndex: function(newVal, oldVal) {
			this.current = this.tutorial[newVal];
		}
	},
	created() {
		this.current = this.tutorial[0];
	},
	mounted() {
		setTimeout(() => {
			// this.status = '';
			this.alert();
		}, 3000)
	},
	methods: {
		showTutorial() {
			this.current = this.tutorial[0];
			this.status = 'tutorial';
		},

		showAttributions() {

		},

		alert() {
			this.$refs.infoBox.classList.add('alert');
			setTimeout(() => {
				this.$refs.infoBox.classList.remove('alert');
			}, 1000);
		}
	}
}
</script>

<style lang="scss">
@import '@/scss/variables.scss';

.info-container {
	position: absolute;
	right: 15px;
	bottom: 15px;
	width: 350px;
	max-height: 100%;
	max-width: 90%;
	display: flex;
	flex-direction: column;
	font-size: 0.9em;
	padding: 25px;
	border-radius: 5px;
	background: linear-gradient(0, $dark 0%, #000000 240%);
	color: white;
	box-shadow: 2px 10px 20px rgba(0, 0, 0, 0.4);
	opacity: 0.4;
	clip-path: circle(30px at calc(100% - 30px) calc(100% - 30px));
	transition: all 400ms ease-in-out;

	&:hover {
		clip-path: circle(200% at calc(100% - 30px) calc(100% - 30px));
		opacity: 1;
		bottom: 20px;
	}

	&.centered {
		max-height: 60%;
		width: 600px;
		max-width: 95%;
		opacity: 1;
		font-size: 1em;
		text-align: center;
		right: 50%;
		bottom: 50%;
		transform: translate(50%, 50%);
		clip-path: circle(200% at calc(100% - 30px) calc(100% - 30px));
	}

	&.alert {
		animation: alert 1000ms ease-in-out;
	}
	@keyframes alert {
		0%, 100% {
			bottom: 15px;
			opacity: 0.4;
		}
		20% {
			bottom: 30px;
			opacity: 1;
		}
		40% {
			bottom: 25px;
			opacity: 1;
		}
		50% {
			bottom: 30px;
			opacity: 1;
		}
	}

	&.error {
		background: linear-gradient(0, brown 0%, #000000 240%);
		animation: error 400ms ease-out;
	}
	@keyframes error {
		0%, 100% {
			right: 15px;
			opacity: 0.4;
		}
		20%, 60% {
			right: 25px;
			opacity: 1;
		}
		40%, 80% {
			right: 5px;
			opacity: 1;
		}
	}

	h2 {
		margin: 0.5em 0;
	}
	p {
		opacity: 0.9;
		margin-bottom: 3em;
	}

	.btn-close {
		position: absolute;
		top: 10px;
		right: 10px;
		height: 30px;
		width: 30px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: white;
		cursor: pointer;
		transition: background 200ms ease-out;
		&:hover {
			background: rgba(255, 255, 255, 0.1);
		}
		&:focus {
			outline: none;
		}
	}

	.info-buttons {
		display: flex;
		flex-wrap: wrap;
		margin-top: auto;

		.btn-group {
			display: flex;
			margin: 0 auto;
			transform: translateX(-20%);
		}
		.btn-tutorial {
			padding: 0 1em;
		}
	}

	.info-icon {
		position: absolute;
		right: 10px;
		bottom: 10px;
		height: 40px;
	}
}
</style>