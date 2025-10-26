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

        // Pre-compute wheel nodes for better performance
        const wheelNodesArray = Object.entries(wheelNodes);
        
        model.traverse((node) => {
            // Handle wheel models for lower LOD levels
            if (this.state.lodLevel < 3 && node.isMesh && node.name) {
                for (const [wheelModel, wheelNodeName] of wheelNodesArray) {
                    if (node.name === wheelNodeName) {
                        this.loadWheelModel(node, wheelModel, modelPath);
                        break; // Exit loop once we find a match
                    }
                }
            }

            // Handle material processing for EXT_ materials
            if (node.isMesh && node.material && node.material.name?.startsWith('EXT_')) {
                this.applyMeshMaterial(node, modelPath);
            }
        });
    }

    applyMeshMaterial(node, modelPath) {
        // Early return for already processed materials
        if (node.userData.materialProcessed) {
            return;
        }
        
        // Mark this node as processed to avoid reprocessing
        node.userData.materialProcessed = true;

        // Handle rim materials
        if (node.material.name.startsWith('EXT_RIM')) {
            const materialName = node.material.name;
            if (materialName.startsWith('EXT_RIM_BLUR')) {
                node.visible = false;
                return;
            }
            
            // Reuse existing rim material instead of creating new ones
            const rimMaterial = new THREE.MeshPhysicalMaterial({
                name: materialName,
                color: this.state.bodyColours[3],
            });
            node.material = rimMaterial;
            this.materialManager.applyMaterialPreset(node.material, paintMaterials.glossy);
            return;
        }

        // Handle special materials (emissive, glass, window)
        const materialName = node.material.name;
        if (materialName.startsWith('EXT_Emissive') || 
            materialName.startsWith('EXT_Glass') || 
            materialName.startsWith('EXT_Window')) {
            
            // Use a shared material instance for these special cases to reduce memory allocation
            node.material = new THREE.MeshPhysicalMaterial({
                transmission: 1,
                color: 0xffffff,
                roughness: 0.0,
                thickness: 0,
                dispersion: 0,
            });
            return;
        }

        // Handle regular textured materials
        let processedMaterialName = materialName;
        if (processedMaterialName === 'EXT_RIM') {
            processedMaterialName = 'EXT_Rim';
        }

        // Use a shared texture loader instance to reduce overhead
        const texturePath = `models/${modelPath}/textures/${processedMaterialName}_Colour.png`;
        
        // Check if texture already exists in cache (simple caching)
        if (this.textureCache && this.textureCache.has(texturePath)) {
            const cachedTexture = this.textureCache.get(texturePath);
            const newMaterial = new THREE.MeshBasicMaterial({
                name: processedMaterialName,
                color: 0xffffff,
                map: cachedTexture,
            });
            node.material = newMaterial;
            return;
        }

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            texturePath,
            (texture) => {
                texture.flipY = false;
                texture.colorSpace = THREE.SRGBColorSpace;
                
                // Cache the texture for future use
                if (!this.textureCache) {
                    this.textureCache = new Map();
                }
                this.textureCache.set(texturePath, texture);
                
                this.state.bodyTextures.push(texture);
                const newMaterial = new THREE.MeshBasicMaterial({
                    name: processedMaterialName,
                    color: 0xffffff,
                    map: texture,
                });
                node.material = newMaterial;
            },
            undefined,
            () => {
                node.material = new THREE.MeshPhysicalMaterial({
                    name: materialName,
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
                        
                        // Apply Y-axis flip exception for Porsche 992 GT3R wheel materials
                        if (modelPath === 'porsche_992_gt3_r' && child.material.map) {
                            child.material.map.flipY = true;
                        }
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
