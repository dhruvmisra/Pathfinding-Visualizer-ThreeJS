<template>
  <div id="app">
    <PathfindingVisualizer />
  </div>
</template>

<script>
import PathfindingVisualizer from './components/PathfindingVisualizer.vue'

export default {
  name: 'App',
  components: {
    PathfindingVisualizer
  }
}
</script>

<style lang="scss">
body {
	font-family: Arial, Helvetica, sans-serif;
	margin: 0;
}
* {
	box-sizing: border-box;
}
#app {
	// background: blueviolet;
	min-height: 100vh;
}
</style>
