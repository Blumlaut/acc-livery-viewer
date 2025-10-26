import * as THREE from 'three';

export class MaterialManager {
    constructor(state) {
        this.state = state;
        this.modelLoader = null;
        // Track resources for memory monitoring
        this.resourceTracker = {
            textures: new Set(),
            materials: new Set(),
            meshes: new Set()
        };
    }

    setModelLoader(modelLoader) {
        this.modelLoader = modelLoader;
    }

    applyMaterialPreset(material, preset) {
        if (typeof material === 'string') {
            material = this.getMaterialFromName(material);
        }

        if (!material) {
            return false;
        }

        if (Array.isArray(material)) {
            let result = false;
            material.forEach((mat) => {
                result = this.applyMaterialPreset(mat, preset) || result;
            });
            return result;
        }

        if (material && material.id) {
            // Early return if preset is the same
            if (material._lastPreset === preset) {
                return material;
            }
            
            material.clearcoat = preset.clearCoat;
            material.clearcoatRoughness = preset.clearCoatRoughness;
            material.metalness = preset.metallic;
            material.roughness = preset.baseRoughness;
            material.needsUpdate = true;
            
            // Cache the preset for future use
            material._lastPreset = preset;
            return material;
        }

        return false;
    }

    getMaterialFromName(materialName) {
        const matches = [];
        const { scene } = this.state;
        if (!scene) {
            return matches;
        }

        scene.traverse((object) => {
            if (object.material && object.material.name === materialName) {
                matches.push(object.material);
            }
        });
        return matches;
    }

    changeMaterialColor(materialName, hexColor) {
        const { scene } = this.state;
        if (!scene) {
            return;
        }
        const color = new THREE.Color(hexColor);
        scene.traverse((object) => {
            if (object.isMesh && object.material && object.material.name === materialName) {
                object.material.color = color;
                object.material.needsUpdate = true;
            }
        });
    }

    applyBodyColours() {
        const { bodyColours, bodyMaterials } = this.state;
        for (let index = 0; index < 3; index++) {
            const materialName = `baseLivery${index + 1}`;
            const colour = bodyColours[index];
            this.changeMaterialColor(materialName, colour);
            this.applyMaterialPreset(materialName, paintMaterials[bodyMaterials[index]]);
            setCookie(`materialColor_${materialName}`, findColorId(colour));
            setCookie(`materialPreset_${materialName}`, bodyMaterials[index]);
        }

        const rimColour = bodyColours[3];
        this.changeMaterialColor('EXT_RIM', rimColour);
        this.applyMaterialPreset('EXT_RIM', paintMaterials[bodyMaterials[3]]);
        setCookie('rimColour', findColorId(rimColour));
        setCookie('rimMaterial', bodyMaterials[3]);
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Failed to load image from ${src}`);
        });
    }

    createTextureFromCanvas(canvas) {
        const texture = new THREE.Texture(canvas);
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        
        // Track texture for cleanup
        this.resourceTracker.textures.add(texture);
        this.state.trackResource('textures');
        
        this.state.bodyTextures.push(texture);
        return texture;
    }

    applyTextureToModel(texture, materialName, preset) {
        const { model, scene } = this.state;
        if (!model || !scene) {
            return null;
        }
        let mesh = null;
        model.traverse((node) => {
            if (node.isMesh && node.material.name === 'EXT_Carpaint_Inst') {
                const material = new THREE.MeshPhysicalMaterial({
                    name: materialName,
                    map: texture,
                    transparent: true,
                    opacity: 1,
                    envMap: scene.environment,
                    depthWrite: false,
                    depthTest: true,
                });
                this.applyMaterialPreset(material, preset);
                
                // Track material for cleanup
                this.resourceTracker.materials.add(material);
                this.state.trackResource('materials');
                
                const overlayMesh = new THREE.Mesh(node.geometry, material);
                overlayMesh.position.copy(node.position);
                overlayMesh.rotation.copy(node.rotation);
                overlayMesh.scale.copy(node.scale).multiplyScalar(1.0001);
                
                // Track mesh for cleanup
                this.resourceTracker.meshes.add(overlayMesh);
                this.state.trackResource('meshes');
                
                scene.add(overlayMesh);
                mesh = overlayMesh;
            }
        });
        if (mesh) {
            this.state.addExtraMesh(mesh);
        }
        return mesh;
    }

    async drawImageOverlay(file, materialName, preset) {
        if (!file) {
            return null;
        }
        try {
            const image = await this.loadImage(file);
            const canvas = setupCanvas(image);
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const texture = this.createTextureFromCanvas(canvas);
            return this.applyTextureToModel(texture, materialName, preset);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async convertImageToRGBChannels(imagePath) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imagePath;
        await new Promise((resolve, reject) => {
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                resolve();
            };
            img.onerror = reject;
        });

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const channelCanvases = [];
        const channelContexts = [];

        for (let i = 0; i < 3; i++) {
            const channelCanvas = document.createElement('canvas');
            channelCanvas.width = canvas.width;
            channelCanvas.height = canvas.height;
            channelCanvases.push(channelCanvas);
            channelContexts.push(channelCanvas.getContext('2d'));
        }

        const channelDataArray = channelContexts.map((ctx) => ctx.createImageData(canvas.width, canvas.height));

        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, alpha] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
            const channels = [r, g, b];
            channels.forEach((value, channelIndex) => {
                const channelData = channelDataArray[channelIndex].data;
                channelData[i] = value;
                channelData[i + 1] = value;
                channelData[i + 2] = value;
                channelData[i + 3] = Math.min(alpha, value);
            });
        }

        channelContexts.forEach((ctx, index) => {
            ctx.putImageData(channelDataArray[index], 0, 0);
        });

        const results = channelCanvases.map((channelCanvas) => channelCanvas.toDataURL('image/png'));
        canvas.remove();
        channelCanvases.forEach((channelCanvas) => channelCanvas.remove());
        return results;
    }

    async setBaseLivery(modelPath, livery) {
        const liveryData = baseLiveries[modelPath]?.[livery];
        if (!liveryData) {
            return;
        }
        this.state.setCurrentLivery(livery);
        setCookie('currentLivery', livery || 100);

        const liveryPath = liveryData.path;
        let images;
        if (liveryData.sponsor) {
            images = await this.convertImageToRGBChannels(`models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Sponsors.png`);
        } else {
            images = await this.convertImageToRGBChannels(`models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Custom.png`);
        }

        for (let i = 0; i < images.length; i++) {
            await this.drawImageOverlay(images[i], `baseLivery${i + 1}`, paintMaterials.customDecal || paintMaterials.glossy);
        }

        if (liveryData.hasDecals) {
            await this.drawImageOverlay(
                `models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Decals.png`,
                'fanatec_overlay',
                paintMaterials.glossy
            );
        }
        this.applyBodyColours();
    }

    cleanupMesh(mesh) {
        const { scene } = this.state;
        if (!mesh || !scene) {
            return;
        }
        scene.remove(mesh);
        
        // Proper cleanup of mesh resources
        if (mesh.material) {
            if (mesh.material.map) {
                mesh.material.map.dispose();
                this.resourceTracker.textures.delete(mesh.material.map);
                this.state.untrackResource('textures');
            }
            mesh.material.dispose();
            this.resourceTracker.materials.delete(mesh.material);
            this.state.untrackResource('materials');
        }
        if (mesh.geometry) {
            mesh.geometry.dispose();
            this.state.untrackResource('geometries');
        }
        
        // Remove from tracking
        this.resourceTracker.meshes.delete(mesh);
        this.state.untrackResource('meshes');
    }

    cleanupPreviousMeshes() {
        // Cleanup extra meshes
        this.state.extraMeshes.forEach((mesh) => this.cleanupMesh(mesh));
        this.state.resetExtraMeshes();
        
        // Cleanup body textures
        this.state.bodyTextures.forEach((texture) => {
            if (texture) {
                texture.dispose();
                this.resourceTracker.textures.delete(texture);
                this.state.untrackResource('textures');
            }
        });
        this.state.bodyTextures = [];

        const { scene } = this.state;
        if (!scene) {
            return;
        }
        
        // Cleanup sponsor and decal materials
        scene.traverse((child) => {
            if (
                child.isMesh &&
                child.material &&
                (child.material.name === 'SponsorMaterial' || child.material.name === 'DecalMaterial')
            ) {
                if (child.material.map) {
                    child.material.map.dispose();
                    this.resourceTracker.textures.delete(child.material.map);
                    this.state.untrackResource('textures');
                }
                child.material.dispose();
                this.resourceTracker.materials.delete(child.material);
                this.state.untrackResource('materials');
                scene.remove(child);
            }
        });
    }

    // Add comprehensive cleanup method for all resources
    cleanupAllResources() {
        // Cleanup previous meshes
        this.cleanupPreviousMeshes();
        
        // Cleanup any remaining tracked resources
        this.resourceTracker.textures.forEach(texture => {
            try {
                texture.dispose();
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.resourceTracker.textures.clear();
        
        this.resourceTracker.materials.forEach(material => {
            try {
                material.dispose();
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.resourceTracker.materials.clear();
        
        this.resourceTracker.meshes.forEach(mesh => {
            try {
                this.cleanupMesh(mesh);
            } catch (e) {
                // Ignore errors during disposal
            }
        });
        this.resourceTracker.meshes.clear();
        
        // Reset tracking
        this.state.cleanupResources();
    }

    async mergeAndSetDecals(livery) {
        const currentModelPath = this.state.currentModelPath;
        if (!currentModelPath) {
            return;
        }

        const activeLivery =
            livery ??
            this.state.currentLivery ??
            (this.modelLoader ? this.modelLoader.getDefaultLivery(currentModelPath) : null);
        if (!activeLivery) {
            return;
        }

        this.state.setCurrentLivery(activeLivery);
        this.cleanupPreviousMeshes();
        await this.setBaseLivery(currentModelPath, activeLivery);

        const { scene } = this.state;
        const canvas = document.getElementById('hiddenCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (scene) {
            scene.traverse((node) => {
                if (node.isMesh && node.material.name === 'EXT_Carpaint_Inst') {
                    this.applyMaterialPreset(node.material, paintMaterials.customDecal || paintMaterials.glossy);
                    node.material.needsUpdate = true;
                }
            });
        }

        await this.drawImageOverlay(this.state.decalsFile, 'DecalMaterial', paintMaterials.customDecal || paintMaterials.glossy);
        await this.drawImageOverlay(
            this.state.sponsorsFile,
            'SponsorMaterial',
            paintMaterials.customSponsor || paintMaterials.matte
        );
        this.applyBodyColours();
        window.viewerReady = true;
        window.dispatchEvent(new Event('viewer-ready'));
    }

    setDecalsFile(url) {
        this.state.setDecalsFile(url);
    }

    setSponsorsFile(url) {
        this.state.setSponsorsFile(url);
    }

    resetCustomLivery() {
        this.cleanupPreviousMeshes();
        this.state.setDecalsFile(null);
        this.state.setSponsorsFile(null);
        paintMaterials.customDecal = undefined;
        paintMaterials.customSponsor = undefined;
    }

    applyCarJsonData(data) {
        const isCarbon = data.skinTemplateKey === 98 || data.skinTemplateKey === 99;
        if (data.skinColor1Id !== undefined && !isCarbon) {
            this.state.bodyColours[0] = coloridToHex(data.skinColor1Id);
        }
        if (data.skinColor2Id !== undefined && !isCarbon) {
            this.state.bodyColours[1] = coloridToHex(data.skinColor2Id);
        }
        if (data.skinColor3Id !== undefined && !isCarbon) {
            this.state.bodyColours[2] = coloridToHex(data.skinColor3Id);
        }
        if (isCarbon) {
            const carbonHex = coloridToHex(1);
            this.state.bodyColours[0] = carbonHex;
            this.state.bodyColours[1] = carbonHex;
            this.state.bodyColours[2] = carbonHex;
        }
        if (data.rimColor1Id !== undefined) {
            this.state.bodyColours[3] = coloridToHex(data.rimColor1Id);
        }

        if (data.skinMaterialType1 !== undefined && materialIdToName[data.skinMaterialType1]) {
            this.state.bodyMaterials[0] = materialIdToName[data.skinMaterialType1];
        }
        if (data.skinMaterialType2 !== undefined && materialIdToName[data.skinMaterialType2]) {
            this.state.bodyMaterials[1] = materialIdToName[data.skinMaterialType2];
        }
        if (data.skinMaterialType3 !== undefined && materialIdToName[data.skinMaterialType3]) {
            this.state.bodyMaterials[2] = materialIdToName[data.skinMaterialType3];
        }
        if (data.rimMaterialType1 !== undefined && materialIdToName[data.rimMaterialType1]) {
            this.state.bodyMaterials[3] = materialIdToName[data.rimMaterialType1];
        }

        this.applyBodyColours();
        return {
            bodyColours: [...this.state.bodyColours],
            bodyMaterials: [...this.state.bodyMaterials],
        };
    }
}
