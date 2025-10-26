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
    }
}
