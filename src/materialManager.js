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
         this.overlayTargets = [];
         this.overlayTargetsModel = null;
         this.baseLiveryCache = new Map();
         this.baseLiveryCacheOrder = [];
this.maxBaseLiveryCacheEntries = 6;
          this.isSoftwareRendering = this.detectSoftwareRendering();
      }
  
detectSoftwareRendering() {
            // Check if createImageBitmap is available (GPU/worker mode)
            if (typeof createImageBitmap === 'undefined') {
                return true;
            }
            
            // Try creating a simple bitmap to verify it actually works
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 2;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return true;
                }
                const imageData = ctx.createImageData(2, 2);
                imageData.data.set([255, 0, 0, 255]);
                ctx.putImageData(imageData, 0, 0);
                const bitmap = createImageBitmap(canvas);
                if (!bitmap || bitmap.width !== 2 || bitmap.height !== 2) {
                    return true;
                }
            } catch (e) {
                return true;
            }
            return false;
        }
  
     setModelLoader(modelLoader) {
         this.modelLoader = modelLoader;
     }

    setOverlayTargets(model) {
        if (!model || model === this.overlayTargetsModel) {
            return;
        }
        this.overlayTargetsModel = model;
        this.overlayTargets = [];
        model.traverse((node) => {
            if (node.isMesh && node.material && node.material.name === 'EXT_Carpaint_Inst') {
                this.overlayTargets.push(node);
            }
        });
    }

    clearOverlayTargets() {
        this.overlayTargets = [];
        this.overlayTargetsModel = null;
    }

    updateUiForModel(modelPath) {
        // Update UI selectors for the new model
        if (typeof window !== 'undefined' && window.uiController && window.uiController.setModelSelection) {
            window.uiController.setModelSelection(modelPath);
            window.uiController.populateLiverySelector(modelPath);
            
            // Set a default livery for the model
            const defaultLivery = this.modelLoader.getDefaultLivery(modelPath);
            if (defaultLivery) {
                this.state.setCurrentLivery(defaultLivery);
                window.uiController.setLiverySelection(defaultLivery);
            }
        }
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
            if (object.isMesh && object.material) {
                // Handle both exact name matches and rim material patterns
                if (object.material.name === materialName || 
                    (materialName === 'EXT_RIM' && object.material.name.startsWith('EXT_RIM'))) {
                    object.material.color = color;
                    object.material.needsUpdate = true;
                }
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

async loadImage(src) {
        console.log('[materialManager loadImage] Attempting to load image from src:', src);
        let response;
        try {
            response = await fetch(src);
        } catch (error) {
            console.error('[materialManager loadImage] Failed to fetch image:', error);
            throw error;
        }

        const blob = await response.blob();
        
        // Use createImageBitmap for GPU/worker mode, fallback to Image for software rendering
        if (!this.isSoftwareRendering && typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(blob);
                console.log('[materialManager loadImage] Image loaded as ImageBitmap:', src, bitmap.width, bitmap.height);
                return bitmap;
            } catch (error) {
                console.warn('[materialManager loadImage] ImageBitmap failed, falling back to Image element:', error);
            }
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(blob);
            img.crossOrigin = 'Anonymous';
            img.src = objectUrl;
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                console.log('[materialManager loadImage] Image loaded successfully:', src, img.width, img.height);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                console.error('[materialManager loadImage] Failed to load image from src:', src);
                reject(`Failed to load image from ${src}`);
            };
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

    applyCanvasOverlay(canvas, materialName, preset) {
        if (!canvas) {
            return null;
        }
        const texture = this.createTextureFromCanvas(canvas);
        canvas.remove();
        return this.applyTextureToModel(texture, materialName, preset);
    }

    applyTextureToModel(texture, materialName, preset) {
        const { model, scene } = this.state;
        if (!model || !scene) {
            return null;
        }
        let mesh = null;
        if (!this.overlayTargetsModel || this.overlayTargetsModel !== model) {
            this.setOverlayTargets(model);
        }

        this.overlayTargets.forEach((node) => {
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
            this.state.addExtraMesh(overlayMesh);
        });
        return mesh;
    }

    async drawImageOverlay(file, materialName, preset) {
        console.log('[materialManager drawImageOverlay] Called with file:', file, 'materialName:', materialName, 'preset:', preset);
        if (!file) {
            console.log('[materialManager drawImageOverlay] No file provided, returning null');
            return null;
        }
        try {
            console.log('[materialManager drawImageOverlay] Calling loadImage');
            const image = await this.loadImage(file);
            console.log('[materialManager drawImageOverlay] Image loaded, creating canvas');
            const canvas = setupCanvas(image);
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            console.log('[materialManager drawImageOverlay] Canvas created, creating texture');
            const texture = this.createTextureFromCanvas(canvas);
            console.log('[materialManager drawImageOverlay] Texture created, applying to model');
            const result = this.applyTextureToModel(texture, materialName, preset);
            console.log('[materialManager drawImageOverlay] Applied texture to model, result:', result);
            return result;
        } catch (error) {
            console.error('[materialManager drawImageOverlay] Error:', error);
            return null;
        }
    }

    async convertImageToRGBChannels(imagePath) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = await this.loadImage(imagePath);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const channelDataArray = [
            ctx.createImageData(canvas.width, canvas.height),
            ctx.createImageData(canvas.width, canvas.height),
            ctx.createImageData(canvas.width, canvas.height),
        ];

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

        canvas.remove();
        return {
            channelDataArray,
            width: canvas.width,
            height: canvas.height,
        };
    }

    buildCanvasesFromChannelData(channelDataArray, width, height) {
        return channelDataArray.map((channelData) => {
            const channelCanvas = document.createElement('canvas');
            channelCanvas.width = width;
            channelCanvas.height = height;
            const channelContext = channelCanvas.getContext('2d');
            channelContext.putImageData(channelData, 0, 0);
            return channelCanvas;
        });
    }

    getCachedBaseLivery(liveryKey) {
        return this.baseLiveryCache.get(liveryKey) || null;
    }

    cacheBaseLivery(liveryKey, data) {
        if (this.baseLiveryCache.has(liveryKey)) {
            return;
        }
        this.baseLiveryCache.set(liveryKey, data);
        this.baseLiveryCacheOrder.push(liveryKey);
        if (this.baseLiveryCacheOrder.length > this.maxBaseLiveryCacheEntries) {
            const oldestKey = this.baseLiveryCacheOrder.shift();
            this.baseLiveryCache.delete(oldestKey);
        }
    }

    async setBaseLivery(modelPath, livery) {
        console.log('[materialManager setBaseLivery] Called with modelPath:', modelPath, 'livery:', livery);
        const liveryData = baseLiveries[modelPath]?.[livery];
        console.log('[materialManager setBaseLivery] Livery data found:', !!liveryData);
        if (!liveryData) {
            console.log('[materialManager setBaseLivery] No livery data found, returning');
            return;
        }
        this.state.setCurrentLivery(livery);
        setCookie('currentLivery', livery || 100);

        const liveryPath = liveryData.path;
        const liveryKey = `${modelPath}:${liveryPath}:${liveryData.sponsor ? 'sponsor' : 'custom'}`;
        let cached = this.getCachedBaseLivery(liveryKey);
        if (!cached) {
            const imagePath = liveryData.sponsor
                ? `models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Sponsors.png`
                : `models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Custom.png`;
            cached = await this.convertImageToRGBChannels(imagePath);
            this.cacheBaseLivery(liveryKey, cached);
        }
        const images = this.buildCanvasesFromChannelData(cached.channelDataArray, cached.width, cached.height);

        await Promise.all(
            images.map((canvas, index) =>
                this.applyCanvasOverlay(canvas, `baseLivery${index + 1}`, paintMaterials.customDecal || paintMaterials.glossy)
            )
        );

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
        this.clearOverlayTargets();
        
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
        this.baseLiveryCache.clear();
        this.baseLiveryCacheOrder = [];
        
        // Reset tracking
        this.state.cleanupResources();
    }

    async mergeAndSetDecals(livery) {
        console.log('[materialManager mergeAndSetDecals] Called with livery:', livery);
        console.log('[materialManager mergeAndSetDecals] Current model path:', this.state.currentModelPath);
        console.log('[materialManager mergeAndSetDecals] Decals file URL:', this.state.decalsFile);
        console.log('[materialManager mergeAndSetDecals] Sponsors file URL:', this.state.sponsorsFile);
        const currentModelPath = this.state.currentModelPath;
        if (!currentModelPath) {
            console.log('[materialManager mergeAndSetDecals] No current model path, returning');
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

    async applyCarJsonData(data) {
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

        if (data.carModelType !== undefined && this.modelLoader) {
            const modelPath = cars[data.carModelType]?.modelKey;
            if (modelPath) {
                // Always load the model if it's different from current, or if no model is loaded yet
                if (modelPath !== this.state.currentModelPath || !this.state.currentModelPath) {
                    this.state.setCurrentModelPath(modelPath);
                    await this.modelLoader.loadModel(modelPath);
                    console.log(`Loaded model ${modelPath} for carModelType ${data.carModelType}`);
                    // Update UI after model is loaded
                    this.updateUiForModel(modelPath);
                } else {
                    console.log(`Model ${modelPath} is already loaded`);
                    // Still update UI selectors even if model is already loaded
                    this.updateUiForModel(modelPath);
                }
            }
        }

        this.applyBodyColours();
        return {
            bodyColours: [...this.state.bodyColours],
            bodyMaterials: [...this.state.bodyMaterials],
        };
    }
}
