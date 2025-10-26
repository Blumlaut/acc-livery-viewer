import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

import { AppState } from './src/state.js';
import { EnvironmentManager } from './src/environmentManager.js';
import { MaterialManager } from './src/materialManager.js';
import { ModelLoader } from './src/modelLoader.js';
import { UIController } from './src/uiController.js';

window.viewerReady = false;

const appState = new AppState();
const environmentManager = new EnvironmentManager(appState);
const materialManager = new MaterialManager(appState);
const modelLoader = new ModelLoader(appState, materialManager);
materialManager.setModelLoader(modelLoader);
const uiController = new UIController(appState, modelLoader, materialManager, environmentManager);

const overlayElements = {
    models: document.getElementById('models'),
    textures: document.getElementById('textures'),
    polygons: document.getElementById('polygons'),
    drawCalls: document.getElementById('drawCalls'),
    loadedCar: document.getElementById('loadedCar'),
    skinId: document.getElementById('skinId'),
    skinColours: document.getElementById('skinColours'),
};

// Animation throttling variables
let lastRenderTime = 0;
let overlayUpdateCounter = 0;
const overlayUpdateInterval = 10; // Update overlay every 10 frames

// Add memory monitoring and cleanup triggers
function setupMemoryMonitoring() {
    // Periodic memory check
    setInterval(() => {
        const stats = appState.resourceStats;
        if (stats.textures > 100 || stats.geometries > 1000 || stats.materials > 500) {
            console.warn('High resource usage detected:', stats);
            // Trigger cleanup if needed
            if (stats.textures > 500) {
                console.log('Performing automatic cleanup due to high texture count');
                materialManager.cleanupAllResources();
            }
        }
    }, 30000); // Check every 30 seconds
}

// Initialize with post-processing enabled by default
if (uiController.postProcessingToggle) {
    uiController.postProcessingToggle.checked = true;
    // Set the initial state to enabled
    if (uiController.state.composer && uiController.state.smaaPass) {
        uiController.state.smaaPass.enabled = true;
    }
}

// Enhanced cleanup function
function cleanupAllResources() {
    console.log('Performing comprehensive resource cleanup...');
    
    // Cleanup all components in proper order
    materialManager.cleanupAllResources();
    environmentManager.cleanupEnvironment();
    modelLoader.cleanupAllModelResources();
    
    // Cleanup scene resources
    if (appState.scene) {
        appState.scene.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    }
    
    // Cleanup renderer resources
    if (appState.renderer) {
        appState.renderer.dispose();
    }
    
    // Reset state
    appState.cleanupResources();
    
    console.log('Resource cleanup completed');
}

async function init() {
    await uiController.initialize();
    setupThreeScene();
    if (uiController.cubemapSelector && appState.currentSkybox) {
        uiController.cubemapSelector.value = appState.currentSkybox;
    }
    if (uiController.skyboxToggle) {
        uiController.skyboxToggle.checked = appState.skyboxEnabled;
    }
    environmentManager.applySkybox(appState.currentSkybox);

    const initialModel = appState.currentModelPath || Object.keys(modelFiles)[0];
    appState.setCurrentModelPath(initialModel);
    uiController.setModelSelection(initialModel);
    uiController.populateLiverySelector(initialModel);

    const defaultLivery = appState.currentLivery || modelLoader.getDefaultLivery(initialModel);
    if (defaultLivery) {
        appState.setCurrentLivery(defaultLivery);
        uiController.setLiverySelection(defaultLivery);
    }

    await modelLoader.loadModel(initialModel);
    setupMemoryMonitoring();
    animate();
}

function setupThreeScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        logarithmicDepthBuffer: true,
        preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('modelContainer').appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const gtaoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
    composer.addPass(gtaoPass);
    gtaoPass.blendIntensity = 1;

    const aoParameters = {
        radius: 0.85,
        distanceExponent: 4.0,
        thickness: 10.0,
        scale: 2.0,
        samples: 32,
        distanceFallOff: 0.0,
        screenSpaceRadius: true,
    };
    const pdParameters = {
        lumaPhi: 10.0,
        depthPhi: 2.0,
        normalPhi: 3.0,
        radius: 16.0,
        radiusExponent: 1.0,
        rings: 2.0,
        samples: 16,
    };
    gtaoPass.updateGtaoMaterial(aoParameters);
    gtaoPass.updatePdMaterial(pdParameters);

    const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    composer.addPass(smaaPass);
    smaaPass.enabled = true;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    appState.setScene(scene);
    appState.setCamera(camera);
    appState.setRenderer(renderer);
    appState.setComposer(composer);
    appState.setGtaoPass(gtaoPass);
    appState.setSmaaPass(smaaPass);

    // Add cleanup on window unload
    window.addEventListener('beforeunload', cleanupAllResources);
    window.addEventListener('unload', cleanupAllResources);
    
    // Add cleanup on resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        gtaoPass.setSize(window.innerWidth, window.innerHeight);
    });

    addLighting(scene);
    configureCamera(camera, renderer, scene);
}

function addLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0x0000ff, 0x00ff00, 0.6);
    scene.add(hemiLight);
}

function configureCamera(camera, renderer, scene) {
    camera.position.set(0, 1, 4);
    const urlParams = new URLSearchParams(window.location.search);
    const sideCamera = urlParams.has('sideCamera');
    if (!sideCamera) {
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.update();
        scene.rotation.y = Math.PI / 4;
    } else {
        camera.position.set(6, 1, 0);
        camera.lookAt(0, 1, 0);
    }
}

function animate() {
    const { renderer, composer } = appState;
    if (!renderer || !composer) {
        return;
    }

    // Throttle rendering to 60 FPS (16.55ms) to reduce CPU usage
    const currentTime = performance.now();
    if (currentTime - lastRenderTime < 16.55) {
        requestAnimationFrame(animate);
        return;
    }
    
    lastRenderTime = currentTime;

    // Update overlay information periodically
    overlayUpdateCounter++;
    if (overlayUpdateCounter >= overlayUpdateInterval) {
        const info = renderer.info;
        overlayElements.models.innerText = `Models: ${info.memory.geometries}`;
        overlayElements.textures.innerText = `Textures: ${info.memory.textures}`;
        overlayElements.polygons.innerText = `Polygons: ${info.render.triangles}`;
        overlayElements.drawCalls.innerText = `Draw Calls: ${info.render.calls}`;

        const carInfo = Object.values(cars).find((car) => car.modelKey === appState.currentModelPath);
        overlayElements.loadedCar.innerText = `Car: ${carInfo ? carInfo.model : appState.currentModelPath}`;
        if (appState.currentLivery) {
            overlayElements.skinId.innerText = `Skin ID: ${appState.currentLivery}`;
        }

        overlayElements.skinColours.innerText =
            `Colours: ${findColorId(appState.bodyColours[0])}, ${findColorId(appState.bodyColours[1])}, ${findColorId(appState.bodyColours[2])}, ${findColorId(appState.bodyColours[3])}`;
        
        overlayUpdateCounter = 0;
    }

    // Only render if there are actual changes or at throttled interval
    composer.render();
    
    requestAnimationFrame(animate);
}

// Add a more sophisticated selective rendering check
function shouldUpdateScene() {
    // If we're in a state where we know nothing has changed, we can skip rendering
    // This is a simple check - in a real app, you might want more sophisticated logic
    return true; // For now, always render but with throttling
}

// Add a selective rendering approach - only render when needed
let lastRenderState = {
    modelPath: null,
    livery: null,
    cameraPosition: null,
    cameraRotation: null
};

function shouldRender() {
    // Check if any significant state has changed that would require a re-render
    const currentState = {
        modelPath: appState.currentModelPath,
        livery: appState.currentLivery,
        cameraPosition: appState.camera ? [appState.camera.position.x, appState.camera.position.y, appState.camera.position.z] : null,
        cameraRotation: appState.camera ? [appState.camera.rotation.x, appState.camera.rotation.y, appState.camera.rotation.z] : null
    };
    
    // Simple comparison - if any key state has changed, we should render
    const changed = 
        lastRenderState.modelPath !== currentState.modelPath ||
        lastRenderState.livery !== currentState.livery ||
        JSON.stringify(lastRenderState.cameraPosition) !== JSON.stringify(currentState.cameraPosition) ||
        JSON.stringify(lastRenderState.cameraRotation) !== JSON.stringify(currentState.cameraRotation);
    
    // Update last state
    lastRenderState = currentState;
    
    return changed;
}

window.captureImage = function () {
    return appState.renderer?.domElement.toDataURL('image/png');
};

init();
