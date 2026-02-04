import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor(state, materialManager) {
        this.state = state;
        this.materialManager = materialManager;
        this.loader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.textureCache = new Map();
        this.materialCache = new Map();
        this.texturePromiseCache = new Map();
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

        this.clearMaterialCaches();
        this.materialManager.clearOverlayTargets();
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

                    this.materialManager.setOverlayTargets(gltf.scene);
                    await this.applyMaterialsToModel(modelPath);

                    if (this.state.currentModelPath !== this.state.prevModelPath || this.state.firstRun) {
                        this.state.firstRun = false;
                        this.state.setPrevModelPath(this.state.currentModelPath);
                    }

                    if (this.state.isAttritionMode) {
                        this.state.attritionModelReady = true;
                    }
                    const livery = this.state.currentLivery ?? this.getDefaultLivery(modelPath);
                    if (livery) {
                        this.state.setCurrentLivery(livery);
                        if (!this.state.deferLiveryMerge) {
                            await this.materialManager.mergeAndSetDecals(livery);
                        } else if (this.state.attritionLiveryReady) {
                            this.state.deferLiveryMerge = false;
                            await this.materialManager.mergeAndSetDecals(livery);
                        }
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

    async applyMaterialsToModel(modelPath) {
        const { model } = this.state;
        if (!model) {
            return;
        }

        // Pre-compute wheel nodes for better performance
        const wheelNodesArray = Object.entries(wheelNodes);
        const textureAssignments = new Map();
        
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
                const assignment = this.prepareMeshMaterial(node, modelPath);
                if (assignment) {
                    const { texturePath, nodes, materialName } = assignment;
                    if (!textureAssignments.has(texturePath)) {
                        textureAssignments.set(texturePath, {
                            nodes,
                            materialName,
                            promise: this.getSharedMaterial(texturePath, materialName, node.material.name),
                        });
                    } else {
                        textureAssignments.get(texturePath).nodes.push(node);
                    }
                }
            }
        });

        const texturePromises = Array.from(textureAssignments.values()).map(async (entry) => {
            const material = await entry.promise;
            entry.nodes.forEach((node) => {
                if (node.isMesh) {
                    node.material = material;
                }
            });
        });

        await Promise.all(texturePromises);
    }

    prepareMeshMaterial(node, modelPath) {
        // Early return for already processed materials
        if (node.userData.materialProcessed) {
            return null;
        }
        
        // Mark this node as processed to avoid reprocessing
        node.userData.materialProcessed = true;

        // Handle rim materials
        if (node.material.name.startsWith('EXT_RIM')) {
            const materialName = node.material.name;
            if (materialName.startsWith('EXT_RIM_BLUR')) {
                node.visible = false;
                return null;
            }
            
            // For rim materials, we should update the existing material rather than replacing it
            // This ensures consistent material properties and avoids UV mapping issues
            if (node.material.isMeshPhysicalMaterial) {
                // Update existing rim material color
                node.material.color.set(this.state.bodyColours[3]);
                node.material.needsUpdate = true;
            } else {
                // Reuse existing rim material instead of creating new ones
                const rimMaterial = new THREE.MeshPhysicalMaterial({
                    name: materialName,
                    color: this.state.bodyColours[3],
                });
                node.material = rimMaterial;
            }
            this.materialManager.applyMaterialPreset(node.material, paintMaterials[this.state.bodyMaterials[3]]);
            return null;
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
            return null;
        }

        // Handle regular textured materials
        let processedMaterialName = materialName;
        if (processedMaterialName === 'EXT_RIM') {
            processedMaterialName = 'EXT_Rim';
        }

        // Use a shared texture loader instance to reduce overhead
        const texturePath = `models/${modelPath}/textures/${processedMaterialName}_Colour.png`;
        return {
            texturePath,
            materialName: processedMaterialName,
            nodes: [node],
        };
    }

    getSharedMaterial(texturePath, processedMaterialName, fallbackMaterialName) {
        if (this.materialCache.has(texturePath)) {
            return Promise.resolve(this.materialCache.get(texturePath));
        }

        if (this.texturePromiseCache.has(texturePath)) {
            return this.texturePromiseCache.get(texturePath);
        }

        const loadPromise = new Promise((resolve) => {
            this.textureLoader.load(
                texturePath,
                (texture) => {
                    texture.flipY = false;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    
                    // Cache the texture for future use
                    this.textureCache.set(texturePath, texture);
                    
                    this.state.bodyTextures.push(texture);
                    const newMaterial = new THREE.MeshBasicMaterial({
                        name: processedMaterialName,
                        color: 0xffffff,
                        map: texture,
                    });
                    this.materialCache.set(texturePath, newMaterial);
                    this.texturePromiseCache.delete(texturePath);
                    resolve(newMaterial);
                },
                undefined,
                () => {
                    this.texturePromiseCache.delete(texturePath);
                    resolve(new THREE.MeshPhysicalMaterial({
                        name: fallbackMaterialName,
                        color: 0x444444,
                    }));
                }
            );
        });

        this.texturePromiseCache.set(texturePath, loadPromise);
        return loadPromise;
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
                        // For wheel materials, we should ensure consistent material handling
                        if (child.material.name.startsWith('EXT_RIM')) {
                            // Update existing rim material color instead of replacing
                            if (child.material.isMeshPhysicalMaterial) {
                                child.material.color.set(this.state.bodyColours[3]);
                                child.material.needsUpdate = true;
                            } else {
                                // Create a new material with consistent properties
                                const newMaterial = new THREE.MeshPhysicalMaterial({
                                    name: child.material.name,
                                    color: this.state.bodyColours[3],
                                    side: THREE.DoubleSide,
                                    // Preserve important material properties to avoid issues
                                    roughness: child.material.roughness || 0.5,
                                    metalness: child.material.metalness || 0.0,
                                });
                                child.material = newMaterial;
                            }
                        } else {
                            const newMaterial = new THREE.MeshPhysicalMaterial({
                                name: child.material.name,
                                color: this.state.bodyColours[3],
                                side: THREE.DoubleSide,
                            });
                            child.material = newMaterial;
                        }
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
        this.clearMaterialCaches();
    }

    clearMaterialCaches() {
        this.materialCache.forEach((material) => {
            try {
                material.dispose();
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.materialCache.clear();
        this.textureCache.forEach((texture) => {
            try {
                texture.dispose();
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.textureCache.clear();
        this.texturePromiseCache.clear();
    }
}
