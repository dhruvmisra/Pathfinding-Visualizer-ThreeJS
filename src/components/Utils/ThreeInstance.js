import * as Three from "three";

let instance = null;

class THREE {
	constructor() {
		if(!instance) {
			instance = {
				...Three,
				VisualizerInstance: {
					scene: null,
					groundId: null
				}
			}
		}
		return instance;
	}
}

export default new THREE();