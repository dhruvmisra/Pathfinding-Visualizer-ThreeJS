<h1 align="center">Pathfinding Visualizer ThreeJS</h1>
<h2 align="center">

[![Mentioned in Awesome Vue.js](https://awesome.re/mentioned-badge.svg)](https://github.com/vuejs/awesome-vue)

</h2>

<div align="center">
<img src="https://img.shields.io/badge/made%20by-dhruvmisra-blue.svg" >

<img src="https://img.shields.io/badge/vue-2.6.11-41B883.svg">

<img src="https://img.shields.io/github/stars/dhruvmisra/Pathfinding-Visualizer-ThreeJS.svg?style=flat&color=orange">

<img src="https://img.shields.io/github/languages/top/dhruvmisra/Pathfinding-Visualizer-ThreeJS.svg?style=flat&color=informational">

<img src="https://img.shields.io/github/issues/dhruvmisra/Pathfinding-Visualizer-ThreeJS.svg">

<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat">
</div>
<br>

*A Visualizer for pathfinding algorithms in 3D.*

<img src="./readme_assets/social_preview.png" width="100%">

## Live Demo
The live demo can be found [here](https://dhruvmisra.github.io/Pathfinding-Visualizer-ThreeJS/).

<img src="./readme_assets/demo.gif" width="100%">

## Features
### Weighted and unweighted algorithms
* **Dijkstra’s algorithm** (weighted) <br>
The father of pathfinding algorithms, it creates a tree of shortest paths from the starting vertex, the source, to all other points in the graph. <b>Guarantees</b> the shortest path!

* **A\* Search algorithm** (weighted) <br>
One of the best and a popular technique used in path-finding and graph traversals with heuristic. <b>Guarantees</b> the shortest path!

* **Breadth-First Search** (unwighted) <br>
The algorithm starts at the tree root, and explores all of the neighbor nodes at the present depth prior to moving on to the nodes at the next depth level. <b>Guarantees</b> the shortest path!

* **Depth-First Search** (unwighted) <br>
The algorithm starts at the root node and explores as far as possible along each branch before backtracking. <b>Does not guarantee</b> the shortest path!

### Maze generation
Two methods to generate a maze:
* Recursive Division
* Random

### First-Person view
Roam around the world you create in First-Person view and watch the algorithm move under your feet!

<img src="./readme_assets/firstPerson.jpg" width="100%">


### Device camera input
Turn on your device's camera to create the walls on the grid from the camera feed! Play around with any image that has some good contrast and see it replicated on the grid. 

<img src="./readme_assets/deviceCam.jpg" width="100%">


## Attributions
### Idea
Clément Mihailescu for the inspiration to build this visualizer through his amazing [project](https://github.com/clementmihailescu/Pathfinding-Visualizer) and [YouTube channel](https://www.youtube.com/channel/UCaO6VoaYJv4kS-TQO_M-N_g)

And playing krunker.io with my friends.

### WebGL Library
Three.js

### Assets & Icons
Textures from [OpenGameArt.org](https://opengameart.org/)

Icons made by [Freepik](https://www.flaticon.com/authors/freepik) from [www.flaticon.com](https://www.flaticon.com/)

## Contributing
Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

## Project setup
```
npm install
npm run serve
```

## Future Scope
* Add touch controls for first-person view
* Add visited nodes counter and path length
* Add more algorithms to visualize

## Support Me
<a href="https://www.buymeacoffee.com/dhruvmisra" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="width: 120px !important;" ></a>

<br>
<p align="center">Made with ❤️ in Vue.js</p>