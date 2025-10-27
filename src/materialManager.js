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
        this.overlayMeshes = new Map();
        this.editorOverlayCanvases = new Map();
        this.editorDecalBaseCanvas = null;
        this.editorDecalOverlayCanvas = null;
        this.editorDecalMaskData = null;
        this.editorOverlayMap = {
            decals: {
                materialName: 'DecalMaterial',
                presetKeys: ['customDecal', 'glossy'],
                fallback: 'glossy',
                aliases: ['fanatec_overlay']
            },
            sponsors: {
                materialName: 'SponsorMaterial',
                presetKeys: ['customSponsor', 'matte'],
                fallback: 'matte'
            }
        };
        this._onEditorCanvasUpdated = this._onEditorCanvasUpdated.bind(this);
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('editor:canvasUpdated', this._onEditorCanvasUpdated);
        }
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

        this._refreshEditorBaseTemplate({ emit: true });
    }

    refreshEditorDecalTemplate(options = {}) {
        const { emit = true } = options;
        const captured = this._hydrateDecalOverlayFromViewer();

        if (this.editorDecalMaskData) {
            this._refreshEditorBaseTemplate({ emit: false });
        }

        if (emit) {
            this._emitDecalTemplateUpdate({
                emit: true,
                materialName: captured?.materialName
            });
        }

        return this.getEditorOverlayCanvas('decals');
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Failed to load image from ${src}`);
        });
    }

    async _ensureCanvasFromSource(source) {
        if (!source) {
            return null;
        }
        if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
            return source;
        }
        if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
            const canvas = setupCanvas(source);
            const context = canvas.getContext('2d');
            context.drawImage(source, 0, 0);
            return canvas;
        }
        if (typeof source === 'string') {
            const image = await this.loadImage(source);
            return this._ensureCanvasFromSource(image);
        }
        return null;
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
        const existingMesh = this.overlayMeshes.get(materialName);
        if (existingMesh) {
            this.cleanupMesh(existingMesh);
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
            this.overlayMeshes.set(materialName, mesh);
            this.state.addExtraMesh(mesh);
        }
        return mesh;
    }

    async drawImageOverlay(source, materialName, preset) {
        if (!source) {
            return null;
        }
        try {
            const canvas = await this._ensureCanvasFromSource(source);
            if (!canvas) {
                return null;
            }
            const texture = this.createTextureFromCanvas(canvas);
            const mesh = this.applyTextureToModel(texture, materialName, preset);
            if (mesh) {
                this._notifyEditorTemplateUpdate(materialName, canvas);
            }
            return mesh;
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

        const channelDataArray = channelContexts.map((channelCtx) => channelCtx.createImageData(canvas.width, canvas.height));

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            [r, g, b].forEach((value, channelIndex) => {
                const channelData = channelDataArray[channelIndex].data;
                channelData[i] = value;
                channelData[i + 1] = value;
                channelData[i + 2] = value;
                channelData[i + 3] = Math.min(alpha, value);
            });
        }

        channelContexts.forEach((channelCtx, index) => {
            channelCtx.putImageData(channelDataArray[index], 0, 0);
        });

        this.editorDecalMaskData = {
            width: canvas.width,
            height: canvas.height,
            data: new Uint8ClampedArray(imageData.data)
        };

        const compositeCanvas = this._createTintedTemplateFromMask();

        return {
            channels: channelCanvases,
            composite: compositeCanvas
        };
    }

    _refreshEditorBaseTemplate(options = {}) {
        if (!this.editorDecalMaskData) {
            return;
        }
        const tinted = this._createTintedTemplateFromMask();
        if (tinted) {
            this._updateDecalTemplateBase(tinted, { ...options, clone: false });
        } else if (options.emit) {
            this._updateDecalTemplateBase(null, options);
        }
    }

    _createTintedTemplateFromMask() {
        if (!this.editorDecalMaskData || typeof document === 'undefined') {
            return null;
        }
        const { width, height, data } = this.editorDecalMaskData;
        if (!width || !height || !data) {
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const tinted = ctx.createImageData(width, height);

        const colours = this._getBodyColourComponents();

        for (let i = 0; i < data.length; i += 4) {
            const rMask = data[i] / 255;
            const gMask = data[i + 1] / 255;
            const bMask = data[i + 2] / 255;
            const alphaMask = data[i + 3] / 255;

            let r = 0;
            let g = 0;
            let b = 0;

            [rMask, gMask, bMask].forEach((mask, index) => {
                const colour = colours[index];
                if (!colour) {
                    return;
                }
                r += colour.r * mask;
                g += colour.g * mask;
                b += colour.b * mask;
            });

            tinted.data[i] = Math.min(255, Math.round(r));
            tinted.data[i + 1] = Math.min(255, Math.round(g));
            tinted.data[i + 2] = Math.min(255, Math.round(b));
            const alpha = Math.max(alphaMask, rMask, gMask, bMask);
            tinted.data[i + 3] = Math.min(255, Math.round(alpha * 255));
        }

        ctx.putImageData(tinted, 0, 0);
        return canvas;
    }

    _getBodyColourComponents() {
        const defaults = ['#ffffff', '#ffffff', '#ffffff'];
        return defaults.map((fallback, index) => {
            const colour = this.state?.bodyColours?.[index] || fallback;
            const parsed = new THREE.Color(colour);
            return {
                r: parsed.r * 255,
                g: parsed.g * 255,
                b: parsed.b * 255,
            };
        });
    }

    _updateDecalTemplateBase(canvas, options = {}) {
        const { emit = true, clone = true, materialName } = options;
        this.editorDecalBaseCanvas = canvas
            ? (clone ? this._cloneCanvas(canvas) : canvas)
            : null;
        this._emitDecalTemplateUpdate({ emit, materialName });
    }

    _updateDecalTemplateOverlay(canvas, options = {}) {
        const { emit = true, clone = true, materialName } = options;
        this.editorDecalOverlayCanvas = canvas
            ? (clone ? this._cloneCanvas(canvas) : canvas)
            : null;
        this._emitDecalTemplateUpdate({ emit, materialName });
    }

    _resetDecalTemplate(options = {}) {
        this.editorDecalBaseCanvas = null;
        this.editorDecalOverlayCanvas = null;
        this.editorOverlayCanvases.delete('decals');
        this.editorDecalMaskData = null;
        const { emit = true, materialName } = options;
        if (emit) {
            this._dispatchOverlayEvent('decals', materialName || this.editorOverlayMap.decals.materialName, null);
        }
    }

    _emitDecalTemplateUpdate(options = {}) {
        const { emit = true, materialName } = options;
        const composite = this._composeDecalTemplate();
        if (composite) {
            this.editorOverlayCanvases.set('decals', composite);
        } else {
            this.editorOverlayCanvases.delete('decals');
        }
        if (emit) {
            this._dispatchOverlayEvent(
                'decals',
                materialName || this.editorOverlayMap.decals.materialName,
                composite || null
            );
        }
    }

    _composeDecalTemplate() {
        const base = this.editorDecalBaseCanvas;
        const overlay = this.editorDecalOverlayCanvas;
        if ((!base || !base.width || !base.height) && (!overlay || !overlay.width || !overlay.height)) {
            return null;
        }
        const width = base?.width || overlay?.width;
        const height = base?.height || overlay?.height;
        if (!width || !height || typeof document === 'undefined') {
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (base && base.width && base.height) {
            ctx.drawImage(base, 0, 0, width, height);
        }
        if (overlay && overlay.width && overlay.height) {
            ctx.drawImage(overlay, 0, 0, width, height);
        }
        return canvas;
    }

    _dispatchOverlayEvent(type, materialName, canvas) {
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined' || !document.dispatchEvent) {
            return;
        }
        document.dispatchEvent(new CustomEvent('viewer:overlayUpdated', {
            detail: {
                type,
                material: materialName,
                canvas
            }
        }));
    }

    _cloneCanvas(source) {
        if (!source || !source.width || !source.height || typeof document === 'undefined') {
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        return canvas;
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

        const channelSources = images?.channels || images || [];
        for (let i = 0; i < channelSources.length; i++) {
            await this.drawImageOverlay(channelSources[i], `baseLivery${i + 1}`, paintMaterials.customDecal || paintMaterials.glossy);
        }

        if (images?.composite) {
            this._updateDecalTemplateBase(images.composite, { emit: false, clone: false });
        } else {
            this._updateDecalTemplateBase(null, { emit: false });
        }

        if (liveryData.hasDecals) {
            await this.drawImageOverlay(
                `models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Decals.png`,
                'fanatec_overlay',
                paintMaterials.glossy
            );
        } else {
            this._updateDecalTemplateOverlay(null, { emit: true, materialName: 'fanatec_overlay' });
        }
        this.applyBodyColours();
    }

    cleanupMesh(mesh) {
        const { scene } = this.state;
        if (!mesh || !scene) {
            return;
        }
        scene.remove(mesh);

        if (Array.isArray(this.state.extraMeshes) && this.state.extraMeshes.length) {
            this.state.extraMeshes = this.state.extraMeshes.filter((tracked) => tracked !== mesh);
        }

        if (this.overlayMeshes && this.overlayMeshes.size) {
            for (const [name, tracked] of this.overlayMeshes.entries()) {
                if (tracked === mesh) {
                    this.overlayMeshes.delete(name);
                }
            }
        }

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
        this.clearEditorOverlays();
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
        if (this.overlayMeshes) {
            this.overlayMeshes.clear();
        }
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
        document.dispatchEvent(new CustomEvent('editor:baseLayersReady', {
            detail: { modelPath: currentModelPath, liveryId: activeLivery }
        }));
    }

    setDecalsFile(url) {
        this.state.setDecalsFile(url);
        document.dispatchEvent(new CustomEvent('editor:baseTextureChanged', {
            detail: { type: 'decals', url }
        }));
    }

    setSponsorsFile(url) {
        this.state.setSponsorsFile(url);
        document.dispatchEvent(new CustomEvent('editor:baseTextureChanged', {
            detail: { type: 'sponsors', url }
        }));
    }

    resetCustomLivery() {
        this.cleanupPreviousMeshes();
        this.state.setDecalsFile(null);
        this.state.setSponsorsFile(null);
        paintMaterials.customDecal = undefined;
        paintMaterials.customSponsor = undefined;
        document.dispatchEvent(new CustomEvent('editor:baseTextureChanged', {
            detail: { type: 'decals', url: null }
        }));
        document.dispatchEvent(new CustomEvent('editor:baseTextureChanged', {
            detail: { type: 'sponsors', url: null }
        }));
    }

    _onEditorCanvasUpdated(event) {
        const detail = event?.detail;
        if (detail?.origin === 'liveryEditor' && detail?.applied) {
            return;
        }
        if (detail?.overlays && typeof detail.overlays === 'object') {
            Object.entries(detail.overlays).forEach(([type, canvas]) => {
                this.updateEditorOverlay(type, canvas);
            });
            return;
        }

        if (detail?.type && detail.canvas) {
            this.updateEditorOverlay(detail.type, detail.canvas);
            return;
        }

        const canvas = detail?.canvas || document.getElementById('hiddenCanvas');
        if (!canvas) {
            return;
        }

        this.updateEditorOverlay('decals', canvas);
        if (this.overlayMeshes.has('SponsorMaterial')) {
            this.updateEditorOverlay('sponsors', canvas);
        }
    }

    _applyCanvasToMaterial(canvas, materialName, preset) {
        if (!canvas) {
            return null;
        }

        let mesh = this.overlayMeshes.get(materialName);
        if (mesh && mesh.material && mesh.material.map) {
            mesh.material.map.image = canvas;
            mesh.material.map.needsUpdate = true;
            this.applyMaterialPreset(mesh.material, preset);
            mesh.material.needsUpdate = true;
        } else {
            if (!this.state.model || !this.state.scene) {
                return null;
            }

            const texture = this.createTextureFromCanvas(canvas);
            mesh = this.applyTextureToModel(texture, materialName, preset);
        }

        if (mesh) {
            this._notifyEditorTemplateUpdate(materialName, canvas);
        }
        return mesh;
    }

    updateEditorOverlay(type, canvas) {
        const config = this.editorOverlayMap?.[type];
        if (!config) {
            return null;
        }

        if (!canvas) {
            this.editorOverlayCanvases.delete(type);
            this._removeOverlayByMaterial(config.materialName);
            return null;
        }

        const preset = this._resolveOverlayPreset(config.presetKeys, config.fallback);
        const mesh = this._applyCanvasToMaterial(canvas, config.materialName, preset);
        if (mesh) {
            this.editorOverlayCanvases.set(type, canvas);
        }
        return mesh;
    }

    clearEditorOverlays() {
        this._resetDecalTemplate({ emit: true });
        Object.keys(this.editorOverlayMap || {}).forEach((type) => {
            const config = this.editorOverlayMap[type];
            this._removeOverlayByMaterial(config.materialName);
            this.editorOverlayCanvases.delete(type);
        });
    }

    _getOverlayTypeFromMaterial(materialName) {
        if (!materialName || !this.editorOverlayMap) {
            return null;
        }
        for (const [type, config] of Object.entries(this.editorOverlayMap)) {
            if (config.materialName === materialName) {
                return type;
            }
            if (Array.isArray(config.aliases) && config.aliases.includes(materialName)) {
                return type;
            }
        }
        return null;
    }

    _notifyEditorTemplateUpdate(materialName, canvas) {
        const overlayType = this._getOverlayTypeFromMaterial(materialName);
        if (!overlayType) {
            return;
        }
        if (overlayType === 'decals') {
            const validCanvas = canvas && canvas.width && canvas.height ? canvas : null;
            const emit = materialName !== this.editorOverlayMap.decals.materialName;
            this._updateDecalTemplateOverlay(validCanvas, { emit, materialName });
            return;
        }
        if (!canvas || !canvas.width || !canvas.height) {
            this.editorOverlayCanvases.delete(overlayType);
        } else {
            this.editorOverlayCanvases.set(overlayType, canvas);
        }
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined' || !document.dispatchEvent) {
            return;
        }
        document.dispatchEvent(new CustomEvent('viewer:overlayUpdated', {
            detail: {
                type: overlayType,
                material: materialName,
                canvas: canvas && canvas.width && canvas.height ? canvas : null
            }
        }));
    }

    getEditorOverlayCanvas(type) {
        return this.editorOverlayCanvases.get(type) || null;
    }

    _hydrateDecalOverlayFromViewer() {
        if (typeof document === 'undefined') {
            return null;
        }

        const candidates = this._getOverlayMaterialCandidates('decals');
        for (const materialName of candidates) {
            const canvas = this._captureOverlayCanvasFromMaterial(materialName);
            if (canvas) {
                this._updateDecalTemplateOverlay(canvas, {
                    emit: false,
                    clone: false,
                    materialName
                });
                return { canvas, materialName };
            }
        }

        return null;
    }

    _getOverlayMaterialCandidates(type) {
        const config = this.editorOverlayMap?.[type];
        if (!config) {
            return [];
        }

        const names = new Set();
        if (config.materialName) {
            names.add(config.materialName);
        }
        if (Array.isArray(config.aliases)) {
            config.aliases.forEach((alias) => names.add(alias));
        }

        return Array.from(names);
    }

    _captureOverlayCanvasFromMaterial(materialName) {
        if (!materialName || typeof document === 'undefined') {
            return null;
        }

        const mesh = this.overlayMeshes.get(materialName);
        const directCanvas = this._cloneTextureImage(mesh?.material?.map?.image);
        if (directCanvas) {
            return directCanvas;
        }

        const materials = this.getMaterialFromName(materialName) || [];
        for (const material of materials) {
            const cloned = this._cloneTextureImage(material?.map?.image);
            if (cloned) {
                return cloned;
            }
        }

        return null;
    }

    _cloneTextureImage(image) {
        if (!image || typeof document === 'undefined') {
            return null;
        }

        if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
            return this._cloneCanvas(image);
        }

        if (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas) {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0);
                return canvas;
            }
            return null;
        }

        if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0);
                return canvas;
            }
            return null;
        }

        if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            if (!width || !height) {
                return null;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0, width, height);
                return canvas;
            }
            return null;
        }

        if (image.data && image.width && image.height) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return null;
                }
                let imageData = null;
                if (typeof ImageData !== 'undefined' && image instanceof ImageData) {
                    imageData = image;
                } else {
                    const dataArray = image.data instanceof Uint8ClampedArray
                        ? image.data
                        : new Uint8ClampedArray(image.data);
                    const expectedLength = image.width * image.height * 4;
                    if (dataArray.length < expectedLength) {
                        return null;
                    }
                    imageData = new ImageData(dataArray.slice(0, expectedLength), image.width, image.height);
                }
                ctx.putImageData(imageData, 0, 0);
                return canvas;
            } catch (error) {
                console.warn('Failed to clone texture image data', error);
                return null;
            }
        }

        return null;
    }

    _resolveOverlayPreset(presetKeys = [], fallbackKey = null) {
        if (Array.isArray(presetKeys)) {
            for (const key of presetKeys) {
                if (paintMaterials?.[key]) {
                    return paintMaterials[key];
                }
            }
        }
        if (fallbackKey && paintMaterials?.[fallbackKey]) {
            return paintMaterials[fallbackKey];
        }
        if (paintMaterials?.glossy) {
            return paintMaterials.glossy;
        }
        const firstKey = Object.keys(paintMaterials || {})[0];
        return firstKey ? paintMaterials[firstKey] : null;
    }

    _removeOverlayByMaterial(materialName) {
        if (!materialName) {
            return;
        }
        if (materialName === 'fanatec_overlay' || materialName === this.editorOverlayMap?.decals?.materialName) {
            const emit = materialName !== this.editorOverlayMap?.decals?.materialName;
            this._updateDecalTemplateOverlay(null, { emit, clone: false, materialName });
        }
        const mesh = this.overlayMeshes.get(materialName);
        if (mesh) {
            this.cleanupMesh(mesh);
            this.overlayMeshes.delete(materialName);
        }
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
