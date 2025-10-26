export class AppState {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.gtaoPass = null;
        this.smaaPass = null;
        this.model = null;
        this.prevModelPath = null;
        this.currentModelPath = null;
        this.currentLivery = null;
        this.envMap = null;
        this.extraMeshes = [];
        this.wheelMeshes = [];
        this.bodyColours = ['#ff0000', '#00ff00', '#0000ff', '#fafafa'];
        this.bodyMaterials = ['glossy', 'glossy', 'glossy', 'glossy'];
        this.bodyTextures = [];
        this.lodLevel = 3;
        this.currentSkybox = typeof cubemaps !== 'undefined' ? cubemaps[0] : null;
        this.skyboxEnabled = false;
        this.decalsFile = null;
        this.sponsorsFile = null;
        this.firstRun = true;
        // Resource tracking for memory monitoring
        this.resourceStats = {
            textures: 0,
            geometries: 0,
            materials: 0,
            meshes: 0,
            lights: 0,
            other: 0
        };
        this.resourceCleanupCallbacks = [];

        this.editorListeners = new Set();

        this.resetEditorState();
    }

    setScene(scene) {
        this.scene = scene;
    }

    setCamera(camera) {
        this.camera = camera;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    setComposer(composer) {
        this.composer = composer;
    }

    setGtaoPass(pass) {
        this.gtaoPass = pass;
    }

    setSmaaPass(pass) {
        this.smaaPass = pass;
    }

    setModel(model) {
        this.model = model;
    }

    setEnvironmentMap(map) {
        this.envMap = map;
    }

    setCurrentModelPath(path) {
        this.currentModelPath = path;
    }

    setCurrentLivery(livery) {
        this.currentLivery = livery;
    }

    setPrevModelPath(path) {
        this.prevModelPath = path;
    }

    setSkybox(folder) {
        this.currentSkybox = folder;
    }

    setSkyboxEnabled(enabled) {
        this.skyboxEnabled = enabled;
    }

    setLodLevel(level) {
        this.lodLevel = Number(level);
    }

    setDecalsFile(url) {
        this.decalsFile = url;
    }

    setSponsorsFile(url) {
        this.sponsorsFile = url;
    }

    resetExtraMeshes() {
        this.extraMeshes = [];
    }

    addExtraMesh(mesh) {
        if (mesh) {
            this.extraMeshes.push(mesh);
        }
    }

    resetWheelMeshes() {
        this.wheelMeshes = [];
    }

    // Resource tracking methods
    trackResource(type, count = 1) {
        if (this.resourceStats.hasOwnProperty(type)) {
            this.resourceStats[type] += count;
        } else {
            this.resourceStats.other += count;
        }
    }

    untrackResource(type, count = 1) {
        if (this.resourceStats.hasOwnProperty(type)) {
            this.resourceStats[type] = Math.max(0, this.resourceStats[type] - count);
        } else {
            this.resourceStats.other = Math.max(0, this.resourceStats.other - count);
        }
    }

    addCleanupCallback(callback) {
        this.resourceCleanupCallbacks.push(callback);
    }

    cleanupResources() {
        // Execute all cleanup callbacks
        this.resourceCleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.warn('Error in resource cleanup callback:', error);
            }
        });
        this.resourceCleanupCallbacks = [];

        // Reset resource stats
        this.resourceStats = {
            textures: 0,
            geometries: 0,
            materials: 0,
            meshes: 0,
            lights: 0,
            other: 0
        };

        this.resetEditorState();
    }

    // Editor state helpers
    resetEditorState() {
        this.layers = [];
        this.baseLayers = { decals: null, sponsors: null };
        this.activeLayerId = null;
        this.activeTool = null;
        this.symmetrySettings = {
            enabled: false,
            axis: 'x',
            mode: 'mirror'
        };
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.dirtyLayers = new Set();
        this.globalTextureDirty = false;

        this._emitEditorEvent('reset');
    }

    setActiveLayer(layerId) {
        if (layerId === null || this.getLayerById(layerId)) {
            this.activeLayerId = layerId;
            this._emitEditorEvent('activeLayerChanged', { layerId });
        }
    }

    setActiveTool(tool) {
        this.activeTool = tool;
        this._emitEditorEvent('activeToolChanged', { tool });
    }

    setSymmetrySettings(settings = {}) {
        this.symmetrySettings = {
            ...this.symmetrySettings,
            ...settings
        };
        this._emitEditorEvent('symmetryChanged', { settings: { ...this.symmetrySettings } });
    }

    getLayerById(layerId) {
        return this.layers.find(layer => layer.id === layerId) || null;
    }

    registerBaseLayer(type, layerId) {
        if (!type || !layerId) {
            return;
        }
        const normalized = type.toLowerCase();
        if (normalized === 'decals' || normalized === 'decalsbase') {
            this.baseLayers.decals = layerId;
        } else if (normalized === 'sponsors' || normalized === 'sponsorsbase') {
            this.baseLayers.sponsors = layerId;
        }
    }

    insertLayer(layerData, index = this.layers.length) {
        if (!layerData) {
            return null;
        }

        const layer = this._normalizeLayer(layerData, { preserveId: true });

        if (index < 0 || index > this.layers.length) {
            index = this.layers.length;
        }

        this.layers.splice(index, 0, layer);

        const baseType = (layer.baseType || layer.type || '').toLowerCase();
        if ((layer.isBase || !this.baseLayers.decals) && (baseType === 'decals' || baseType === 'decalsbase')) {
            this.registerBaseLayer('decals', layer.id);
        } else if ((layer.isBase || !this.baseLayers.sponsors) && (baseType === 'sponsors' || baseType === 'sponsorsbase')) {
            this.registerBaseLayer('sponsors', layer.id);
        }

        this.markLayerDirty(layer.id);
        this._emitEditorEvent('layerInserted', { layer: { ...layer }, index });
        return layer;
    }

    deleteLayer(layerId) {
        const layer = this.getLayerById(layerId);
        if (!layer) {
            return false;
        }

        const baseType = (layer.baseType || layer.type || '').toLowerCase();
        const isProtectedBase =
            layer.locked ||
            layer.isBase ||
            this.baseLayers.decals === layerId ||
            this.baseLayers.sponsors === layerId ||
            baseType === 'decals' ||
            baseType === 'decalsbase' ||
            baseType === 'sponsors' ||
            baseType === 'sponsorsbase';

        if (isProtectedBase) {
            console.warn('Attempted to delete a protected layer:', layerId);
            return false;
        }

        this.layers = this.layers.filter(existing => existing.id !== layerId);
        if (this.activeLayerId === layerId) {
            this.activeLayerId = null;
        }

        this.markLayerDirty(layerId);
        this._emitEditorEvent('layerDeleted', { layerId });
        return true;
    }

    reorderLayer(layerId, newIndex) {
        const currentIndex = this.layers.findIndex(layer => layer.id === layerId);
        if (currentIndex === -1) {
            return false;
        }

        if (newIndex < 0) {
            newIndex = 0;
        } else if (newIndex >= this.layers.length) {
            newIndex = this.layers.length - 1;
        }

        const [layer] = this.layers.splice(currentIndex, 1);
        this.layers.splice(newIndex, 0, layer);

        this.markLayerDirty(layerId);
        this._emitEditorEvent('layerReordered', { layerId, index: newIndex });
        return true;
    }

    mergeLayers(targetLayerId, sourceLayerId, mergeCallback) {
        const targetLayer = this.getLayerById(targetLayerId);
        const sourceLayer = this.getLayerById(sourceLayerId);

        if (!targetLayer || !sourceLayer) {
            return false;
        }

        if (targetLayer.locked || sourceLayer.locked) {
            console.warn('Attempted to merge locked layers.');
            return false;
        }

        if (sourceLayer.isBase ||
            this.baseLayers.decals === sourceLayerId ||
            this.baseLayers.sponsors === sourceLayerId) {
            console.warn('Attempted to merge from a protected base layer.');
            return false;
        }

        const sourceBaseType = (sourceLayer.baseType || sourceLayer.type || '').toLowerCase();
        if (sourceBaseType === 'decals' || sourceBaseType === 'decalsbase' ||
            sourceBaseType === 'sponsors' || sourceBaseType === 'sponsorsbase') {
            console.warn('Attempted to merge from a protected base layer.');
            return false;
        }

        if (typeof mergeCallback === 'function') {
            mergeCallback(targetLayer, sourceLayer);
        }

        this.deleteLayer(sourceLayerId);
        this.markLayerDirty(targetLayerId);
        this._emitEditorEvent('layersMerged', { targetLayerId, sourceLayerId });
        return true;
    }

    markLayerDirty(layerId = null) {
        if (layerId) {
            this.dirtyLayers.add(layerId);
        }
        this.globalTextureDirty = true;
        this._emitEditorEvent('layerDirty', { layerId });
    }

    consumeDirtyLayers() {
        const dirty = Array.from(this.dirtyLayers);
        this.dirtyLayers.clear();
        this.globalTextureDirty = false;
        return dirty;
    }

    recordUndoState(snapshot = this.captureEditorState()) {
        if (!snapshot) {
            return;
        }
        const safeSnapshot = this._cloneState(snapshot);
        if (safeSnapshot) {
            this.undoStack.push(safeSnapshot);
            if (this.undoStack.length > this.maxUndoSteps) {
                this.undoStack.shift();
            }
            this.redoStack = [];
        }
    }

    undo() {
        if (!this.undoStack.length) {
            return null;
        }
        const current = this.captureEditorState();
        const snapshot = this.undoStack.pop();
        if (current) {
            const currentClone = this._cloneState(current);
            if (currentClone) {
                this.redoStack.push(currentClone);
            }
        }
        const restored = this._cloneState(snapshot);
        if (restored) {
            this.applyEditorState(restored);
        }
        return restored;
    }

    redo() {
        if (!this.redoStack.length) {
            return null;
        }
        const current = this.captureEditorState();
        const snapshot = this.redoStack.pop();
        if (current) {
            const currentClone = this._cloneState(current);
            if (currentClone) {
                this.undoStack.push(currentClone);
            }
        }
        const restored = this._cloneState(snapshot);
        if (restored) {
            this.applyEditorState(restored);
        }
        return restored;
    }

    captureEditorState() {
        return {
            layers: this.layers.map(layer => this._cloneLayer(layer)),
            baseLayers: { ...this.baseLayers },
            activeLayerId: this.activeLayerId,
            activeTool: this.activeTool,
            symmetrySettings: { ...this.symmetrySettings }
        };
    }

    applyEditorState(state) {
        if (!state) {
            return;
        }
        this.layers = state.layers ? state.layers.map(layer => this._normalizeLayer(layer, { preserveId: true })) : [];
        this.baseLayers = state.baseLayers ? { ...state.baseLayers } : { decals: null, sponsors: null };
        this.activeLayerId = state.activeLayerId || null;
        this.activeTool = state.activeTool || null;
        this.symmetrySettings = state.symmetrySettings ? { ...state.symmetrySettings } : { enabled: false, axis: 'x', mode: 'mirror' };
        this.markLayerDirty();
        this._emitEditorEvent('stateApplied', { state: this.captureEditorState() });
    }

    _generateLayerId() {
        return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _cloneState(state) {
        if (state == null) {
            return null;
        }
        if (typeof globalThis.structuredClone === 'function') {
            try {
                return globalThis.structuredClone(state);
            } catch (error) {
                console.warn('structuredClone failed for editor state, falling back to JSON clone.', error);
            }
        }
        try {
            return JSON.parse(JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to clone editor state snapshot.', error);
            return null;
        }
    }

    _cloneLayer(layer) {
        if (!layer) {
            return null;
        }
        return {
            id: layer.id,
            name: layer.name,
            type: layer.type,
            locked: Boolean(layer.locked),
            visible: layer.visible !== false,
            isBase: Boolean(layer.isBase),
            baseType: layer.baseType || null,
            metadata: this._cloneLayerMetadata(layer.metadata)
        };
    }

    _normalizeLayer(layerData = {}, { preserveId = true } = {}) {
        const id = preserveId && layerData.id ? layerData.id : (layerData.id || this._generateLayerId());
        const normalized = {
            id,
            name: layerData.name || 'Layer',
            type: layerData.type || 'paint',
            locked: Boolean(layerData.locked),
            visible: layerData.visible !== false,
            isBase: Boolean(layerData.isBase),
            baseType: layerData.baseType || null,
            metadata: this._cloneLayerMetadata(layerData.metadata)
        };
        return normalized;
    }

    _cloneLayerMetadata(metadata) {
        const source = metadata && typeof metadata === 'object' ? metadata : {};
        const cloned = { ...source };
        cloned.items = Array.isArray(source.items)
            ? source.items.map((item) => this._cloneLayerItem(item))
            : [];
        return cloned;
    }

    _cloneLayerItem(item) {
        if (item == null) {
            return item;
        }
        if (typeof globalThis.structuredClone === 'function') {
            try {
                return globalThis.structuredClone(item);
            } catch (error) {
                console.warn('structuredClone failed for layer item, falling back to JSON clone.', error);
            }
        }
        try {
            return JSON.parse(JSON.stringify(item));
        } catch (error) {
            console.warn('Failed to clone editor layer item.', error);
            return { ...item };
        }
    }

    addEditorListener(listener) {
        if (typeof listener === 'function') {
            this.editorListeners.add(listener);
        }
    }

    removeEditorListener(listener) {
        if (listener && this.editorListeners.has(listener)) {
            this.editorListeners.delete(listener);
        }
    }

    _emitEditorEvent(type, detail = {}) {
        if (!this.editorListeners.size) {
            return;
        }
        const payload = { type, detail, state: this };
        this.editorListeners.forEach((listener) => {
            try {
                listener(payload);
            } catch (error) {
                console.warn('Editor listener error:', error);
            }
        });
    }
}
