import * as THREE from 'three';

export class EnvironmentManager {
    constructor(state) {
        this.state = state;
        this.cubeTextureLoader = new THREE.CubeTextureLoader();
        // Track skybox resources for cleanup
        this.trackedEnvMaps = new Set();
    }

    applySkybox(folderName) {
        const { scene } = this.state;
        if (!scene || !folderName) {
            return;
        }

        // Cleanup previous environment map
        scene.environment = null;
        scene.background = null;
        if (this.state.envMap) {
            try {
                this.state.envMap.dispose();
                this.trackedEnvMaps.delete(this.state.envMap);
            } catch (e) {
                // Ignore disposal errors
            }
        }

        const directions = ['negx', 'posx', 'posy', 'negy', 'negz', 'posz'];
        const envMap = this.cubeTextureLoader.load(
            directions.map((dir) => `cubemap/${folderName}/${dir}.jpg`)
        );
        envMap.encoding = THREE.sRGBEncoding;

        // Track the new environment map
        this.trackedEnvMaps.add(envMap);

        if (this.state.skyboxEnabled) {
            scene.background = envMap;
        }

        scene.environment = envMap;
        this.state.setEnvironmentMap(envMap);
        this.state.setSkybox(folderName);
        setCookie('skybox', folderName);

        if (this.state.model) {
            this.state.model.traverse((node) => {
                if (node.isMesh && node.material) {
                    node.material.envMap = scene.environment;
                    node.material.needsUpdate = true;
                }
            });
            this.state.model.updateMatrixWorld();
        }
    }

    toggleSkybox(enabled) {
        this.state.setSkyboxEnabled(enabled);
        setCookie('skyboxActive', enabled);

        if (!this.state.scene) {
            return;
        }

        if (enabled) {
            this.applySkybox(this.state.currentSkybox);
        } else {
            this.state.scene.background = null;
        }
    }

    // Add cleanup method for environment resources
    cleanupEnvironment() {
        // Cleanup all tracked environment maps
        this.trackedEnvMaps.forEach(envMap => {
            try {
                envMap.dispose();
            } catch (e) {
                // Ignore disposal errors
            }
        });
        this.trackedEnvMaps.clear();
        
        // Reset scene environment
        if (this.state.scene) {
            this.state.scene.environment = null;
            this.state.scene.background = null;
        }
    }
}
