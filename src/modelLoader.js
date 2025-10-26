import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor(state, materialManager) {
        this.state = state;
        this.materialManager = materialManager;
        this.loader = new GLTFLoader();
        // Track model resources for cleanup
        this.trackedModels = new Set();
    }

    disposeCurrentModel() {
        const { scene, model } = this.state;
        if (model && scene) {
            scene.remove(model);
            
            // Cleanup model resources
            this.materialManager.cleanupPreviousMeshes();
            
            model.traverse((node) => {
                if (node.isMesh) {
                    // Track geometry disposal
                    if (node.geometry) {
                        node.geometry.dispose();
                        this.state.untrackResource('geometries');
                    }
                    if (node.material?.isMaterial) {
                        // Track material disposal
                        node.material.dispose();
                        this.state.untrackResource('materials');
                    } else if (Array.isArray(node.material)) {
                        node.material.forEach((material) => {
                            material.dispose();
                            this.state.untrackResource('materials');
                        });
                    }
                }
            });
            
            // Remove from tracked models
            this.trackedModels.delete(model);
        }
    }

    disposeWheels() {
        const { scene, wheelMeshes } = this.state;
        if (!scene) {
            return;
        }
        wheelMeshes.forEach((wheel) => {
            scene.remove(wheel);
            wheel.traverse((node) => {
                if (node.isMesh) {
                    this.materialManager.cleanupMesh(node);
                }
            });
        });
        this.state.resetWheelMeshes();
    }

    getDefaultLivery(modelPath) {
        const liveries = baseLiveries[modelPath];
        if (!liveries) {
            return null;
        }
        const [firstLivery] = Object.keys(liveries);
        return firstLivery ?? null;
    }

    loadModel(modelPath) {
        window.viewerReady = false;
        setCookie('model', modelPath);
        this.state.setCurrentModelPath(modelPath);

        this.disposeCurrentModel();
        this.disposeWheels();
        this.state.bodyTextures = [];

        const { lodLevel } = this.state;
        const fullPath = `models/${modelPath}/${modelFiles[modelPath]}_Lod${lodLevel}.gltf`;

        return new Promise((resolve, reject) => {
            this.loader.load(
                fullPath,
                async (gltf) => {
                    const { scene } = this.state;
                    this.state.setModel(gltf.scene);
                    if (scene) {
                        scene.add(gltf.scene);
                    }
                    
                    // Track the new model
                    this.trackedModels.add(gltf.scene);

                    this.applyMaterialsToModel(modelPath);

                    if (this.state.currentModelPath !== this.state.prevModelPath || this.state.firstRun) {
                        this.state.firstRun = false;
                        this.state.setPrevModelPath(this.state.currentModelPath);
                    }

                    const livery = this.state.currentLivery ?? this.getDefaultLivery(modelPath);
                    if (livery) {
                        this.state.setCurrentLivery(livery);
                        await this.materialManager.mergeAndSetDecals(livery);
                    }

                    this.materialManager.applyMaterialPreset('baseLivery1', paintMaterials[this.state.bodyMaterials[0]]);
                    this.materialManager.applyMaterialPreset('baseLivery2', paintMaterials[this.state.bodyMaterials[1]]);
                    this.materialManager.applyMaterialPreset('baseLivery3', paintMaterials[this.state.bodyMaterials[2]]);
                    this.materialManager.applyMaterialPreset('EXT_RIM', paintMaterials[this.state.bodyMaterials[3]]);
                    resolve();
                },
                undefined,
                (error) => {
                    console.error(`Failed to load model ${fullPath}`, error);
                    reject(error);
                }
            );
        });
    }

    applyMaterialsToModel(modelPath) {
        const { model } = this.state;
        if (!model) {
            return;
        }

        model.traverse((node) => {
            if (this.state.lodLevel < 3) {
                for (const [wheelModel, wheelNodeName] of Object.entries(wheelNodes)) {
                    if (node.name === wheelNodeName) {
                        this.loadWheelModel(node, wheelModel, modelPath);
                    }
                }
            }

            if (node.isMesh && node.material && node.material.name?.startsWith('EXT_')) {
                this.applyMeshMaterial(node, modelPath);
            }
        });
    }

    applyMeshMaterial(node, modelPath) {
        if (node.material.name.startsWith('EXT_RIM')) {
            const materialName = node.material.name;
            if (materialName.startsWith('EXT_RIM_BLUR')) {
                node.visible = false;
                return;
            }
            const rimMaterial = new THREE.MeshPhysicalMaterial({
                name: materialName,
                color: this.state.bodyColours[3],
            });
            node.material = rimMaterial;
            this.materialManager.applyMaterialPreset(node.material, paintMaterials.glossy);
            return;
        }

        if (
            node.material.name.startsWith('EXT_Emissive') ||
            node.material.name.startsWith('EXT_Glass') ||
            node.material.name.startsWith('EXT_Window')
        ) {
            node.material = new THREE.MeshPhysicalMaterial({
                transmission: 1,
                color: 0xffffff,
                roughness: 0.0,
                thickness: 0,
                dispersion: 0,
            });
            return;
        }

        let materialName = node.material.name;
        if (materialName === 'EXT_RIM') {
            materialName = 'EXT_Rim';
        }

        const texturePath = `models/${modelPath}/textures/${materialName}_Colour.png`;
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            texturePath,
            (texture) => {
                texture.flipY = false;
                texture.colorSpace = THREE.SRGBColorSpace;
                this.state.bodyTextures.push(texture);
                const newMaterial = new THREE.MeshBasicMaterial({
                    name: materialName,
                    color: 0xffffff,
                    map: texture,
                });
                node.material = newMaterial;
            },
            undefined,
            () => {
                node.material = new THREE.MeshPhysicalMaterial({
                    name: node.material.name,
                    color: 0x444444,
                });
            }
        );
    }

    loadWheelModel(node, model, modelPath) {
        const loader = new GLTFLoader();
        const actualModelName = modelFiles[modelPath].replace('_sprint', '').replace('_exterior', '');
        loader.load(
            `models/${modelPath}/${actualModelName}_${model}_Lod1.gltf`,
            (gltf) => {
                const wheelModel = gltf.scene;
                const wheelObject = wheelModel.children[0];
                wheelModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const newMaterial = new THREE.MeshPhysicalMaterial({
                            name: child.material.name,
                            color: this.state.bodyColours[3],
                            side: THREE.DoubleSide,
                        });
                        child.material = newMaterial;
                        this.materialManager.applyMaterialPreset(child.material, paintMaterials[this.state.bodyMaterials[3]]);
                    }
                });

                this.state.scene.add(wheelObject);
                this.state.wheelMeshes.push(wheelObject);
                wheelObject.rotation.copy(node.rotation);
                wheelObject.position.copy(node.position);
            },
            undefined,
            (err) => {
                console.warn(`Wheel model missing for ${modelPath}, loading fallback`, err);
                if (modelPath !== 'bmw_m4_gt3') {
                    this.loadWheelModel(node, model, 'bmw_m4_gt3');
                }
            }
        );
    }

    // Add comprehensive cleanup method for model resources
    cleanupAllModelResources() {
        // Cleanup current model
        this.disposeCurrentModel();
        
        // Cleanup wheels
        this.disposeWheels();
        
        // Cleanup any remaining tracked models
        this.trackedModels.forEach(model => {
            try {
                // Remove from scene if still present
                if (this.state.scene && model.parent) {
                    this.state.scene.remove(model);
                }
                // Dispose of model resources
                model.traverse((node) => {
                    if (node.isMesh) {
                        if (node.geometry) {
                            node.geometry.dispose();
                            this.state.untrackResource('geometries');
                        }
                        if (node.material?.isMaterial) {
                            node.material.dispose();
                            this.state.untrackResource('materials');
                        }
                    }
                });
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.trackedModels.clear();
    }
}
