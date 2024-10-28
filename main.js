import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


let scene, camera, renderer, model, curModelPath

let extraMeshes = []
let bodyColours = [ "#ff0000", "#00ff00", "#0000ff" ]

let currentSkybox = cubemaps[0]
let skyboxState = false

function init() {
    // Create the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('modelContainer').appendChild(renderer.domElement);
    setSkybox(scene, currentSkybox);

    // Populate the dropdown with available models
    const modelSelector = document.getElementById('modelSelector');
    modelFiles.forEach((file) => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        modelSelector.appendChild(option);
    });

    const cubemapSelector = document.getElementById('cubemapSelector');
    cubemaps.forEach((file) => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        cubemapSelector.appendChild(option);
    });

    const skyboxToggle = document.getElementById('skybox-toggle');
    //skyboxToggle.setAttribute("checked", skyboxState);
    skyboxToggle.addEventListener('change', () => {
        skyboxState = skyboxToggle.checked;
        if (skyboxToggle.checked) {
            setSkybox(scene, currentSkybox);
        } else {
            scene.background = null;
        }
    });

    // Load the initial model
    loadModel(modelFiles[0]); // Load the first model initially

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    //const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
    //scene.add(directionalLight);
    const hemiLight = new THREE.HemisphereLight( 0x0000ff, 0x00ff00, 0.6 ); 
    scene.add(hemiLight)

    // Set camera position
    camera.position.z = 3.5;
    camera.position.x= 1;
    camera.position.y = 1;

    // Add OrbitControls for camera control
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    scene.rotation.y = Math.PI / 4;

    // Handle model change
    modelSelector.addEventListener('change', (event) => {
        const selectedModel = event.target.value;
        loadModel(selectedModel);
    });


    cubemapSelector.addEventListener('change', (event) => {
        const selectedCubemap = event.target.value;
        setSkybox(scene, selectedCubemap)
    });


    const liverySelector = document.getElementById('liverySelector');
    liverySelector.addEventListener('change', (event) => {
        setBaseLivery(curModelPath, event.target.value);
    });

    const unloadLiveryBtn = document.getElementById('unloadCustomLivery');
    unloadLiveryBtn.addEventListener('click', () => {
        cleanupPreviousMeshes()
        decalsFile = undefined;
        sponsorsFile = undefined;
        paintMaterials.customDecal = undefined;
        paintMaterials.customSponsor = undefined;
        setBaseLivery(curModelPath, liverySelector.value);
    });

    const layer1Color = document.getElementById('layer1Color');
    layer1Color.addEventListener('change', (event) => {
        bodyColours[0] = event.target.value;
        console.log(event.target.value)
        applyBodyColours()
    });

    const layer2Color = document.getElementById('layer2Color');
    layer2Color.addEventListener('change', (event) => {
        bodyColours[1] = event.target.value;
        applyBodyColours()
    });

    const layer3Color = document.getElementById('layer3Color');
    layer3Color.addEventListener('change', (event) => {
        bodyColours[2] = event.target.value;
        applyBodyColours()
    });

    

    // Animation loop
    animate();
}

function setSkybox(scene, folderName) {
    const cubeMapLoader = new THREE.CubeTextureLoader();
    const directions = ['negx', 'posx', 'posy', 'negy', 'negz', 'posz'];

    // Load the cubemap textures directly using CubeTextureLoader
    const envMap = cubeMapLoader.load(
        directions.map(dir => `cubemap/${folderName}/${dir}.jpg`)
    );

    // Set encoding for correct color space handling
    envMap.encoding = THREE.sRGBEncoding;

    // Set the cubemap as both the background and the environment map
    if (skyboxState) {
        scene.background = envMap;
    }
    scene.environment = envMap;
    currentSkybox = folderName;

    // If there is a model in the scene, apply the environment map to specific materials
    if (model) {
        scene.traverse((node) => {
                if (node.isMesh && (node.material.name === "EXT_Carpaint_Inst" || node.material.name === "DecalMaterial" || node.material.name === "SponsorMaterial")) {
                    node.material.envMap = scene.environment;
                    node.material.needsUpdate = true;
                }
            });
        model.updateMatrixWorld();
    }
}



function loadModel(modelPath) {
    // Remove the existing model if it exists
    if (model) {
        scene.remove(model);
        extraMeshes.forEach(mesh => scene.remove(mesh));
        model.traverse((node) => {
            if (node.isMesh) {
                node.geometry.dispose();
                if (node.material.isMaterial) {
                    cleanMaterial(node.material);
                } else {
                    // Dispose of each material
                    node.material.forEach(material => cleanMaterial(material));
                }
            }
        });
    }

    // Load new GLTF model
    const loader = new GLTFLoader();
    let fullFilePath = `models/${modelPath}/${modelPath}_exterior.gltf`
    // if modelPath is in enduKitCars
    if (enduKitCars.includes(modelPath)) {
        fullFilePath = `models/${modelPath}/${modelPath}_exterior_endurance.gltf`
    }

    loader.load(fullFilePath, (gltf) => {
        model = gltf.scene;
        scene.add(model);
        curModelPath = modelPath
        setBaseLivery(modelPath, 1)
        const liverySelector = document.getElementById('liverySelector');
        for (let a in liverySelector.options) { liverySelector.options.remove(0); } 
        for (let i = 1; i < baseLiveries[modelPath]+1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = "Skin "+i;
            liverySelector.appendChild(option);
        };
    });
}

function cleanMaterial(material) {
    material.dispose();
}

var decalsFile = null;
var sponsorsFile = null;

async function setBaseLivery(modelPath, liveryId) {
    const images = await convertImageToRGBChannels(`models/${modelPath}/skins/custom/custom_${liveryId}/EXT_Skin_Custom.png`)
    // iterate through images
    for (let i = 0; i < images.length; i++) {
        let image = images[i];
        await drawImageOverlay(image, "baseLivery"+(i+1), paintMaterials.customDecal || paintMaterials.glossy)
    }
    applyBodyColours()

    return
    loadStaticImage(`models/${modelPath}/skins/custom/custom_${liveryId}/EXT_Skin_Custom.png`).then((texture) => {
        // Set texture properties
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.anisotropy = 16;

        model.traverse((node) => {
            if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                const decalMaterial = new THREE.MeshPhysicalMaterial({
                    name: node.material.name,
                    color: 0xffffff,
                    envMap: scene.environment,
                    map: texture,
                    depthWrite: true,
                });
                applyMaterialPreset(decalMaterial, paintMaterials.customDecal || paintMaterials.glossy)

                node.material = decalMaterial;
                node.material.needsUpdate = true;
            }
        });
    });
}

function cleanupPreviousMeshes() {
    extraMeshes.forEach(mesh => scene.remove(mesh));
    scene.traverse((child) => {
        if (child.isMesh && (child.material.name === "SponsorMaterial" || child.material.name === "DecalMaterial")) {
            scene.remove(child);
        }
    });
}

function setupCanvas(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    return canvas;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => reject(`Failed to load image from ${src}`);
    });
}

function createTextureFromCanvas(canvas) {
    const texture = new THREE.Texture(canvas);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
}

function applyTextureToModel(texture, materialName, preset) {
    let mesh
    model.traverse((node) => {
        if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
            const material = new THREE.MeshPhysicalMaterial({
                name: materialName,
                map: texture,
                transparent: true,
                opacity: 1,
                envMap: scene.environment,
                depthWrite: false,
                depthTest: true,
            });
            applyMaterialPreset(material, preset);
            
            mesh = new THREE.Mesh(node.geometry, material);
            mesh.position.copy(node.position);
            mesh.rotation.copy(node.rotation);
            mesh.scale.copy(node.scale).multiplyScalar(1.0001);

            scene.add(mesh);
        }
    });
    return mesh
}

async function drawImageOverlay(file, materialName, material) {
    if (!file) {
        console.log("Decals missing, skipping decals layer.");
        return;
    }
    try {
        const imgDecal = await loadImage(file);
        const decalCanvas = setupCanvas(imgDecal);
        const decalCtx = decalCanvas.getContext('2d');
        decalCtx.drawImage(imgDecal, 0, 0);
        const decalTexture = createTextureFromCanvas(decalCanvas);
        const mesh = applyTextureToModel(decalTexture, materialName, material);
        console.log("finished drawing overlay for "+materialName)
        extraMeshes.push(mesh)
        return mesh
    } catch (error) {
        console.error(error);
    }
}

async function mergeAndSetDecals() {
    const canvas = document.getElementById('hiddenCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cleanupPreviousMeshes();

    scene.traverse((node) => {
        if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
            applyMaterialPreset(node.material, paintMaterials.customDecal || paintMaterials.glossy);
            node.material.needsUpdate = true;
        }
    });

    try {
        await drawImageOverlay(decalsFile, "DecalMaterial", paintMaterials.customDecal || paintMaterials.glossy)
        await drawImageOverlay(sponsorsFile, "SponsorMaterial", paintMaterials.customSponsor || paintMaterials.matte)
        applyBodyColours()
    } catch (error) {
        console.error(error);
    }
}





document.getElementById('multiFileUpload').addEventListener('change', handleFileUpload);

const fileActions = {
    'decals.png': file => { decalsFile = URL.createObjectURL(file); },
    'sponsors.png': file => { sponsorsFile = URL.createObjectURL(file); },
    'decals.json': content => { paintMaterials.customDecal = content; },
    'sponsors.json': content => { paintMaterials.customSponsor = content; }
};

function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    files.forEach(processFile);
    setTimeout(mergeAndSetDecals, 100);
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        if (isImageFile(e.target.result)) {
            handleImageFile(file, e.target.result);
        } else {
            handleJsonFile(file, e.target.result);
        }
    };
    reader.readAsDataURL(file);
}

function isImageFile(dataUrl) {
    return dataUrl.match(/image/i);
}

function handleImageFile(file, dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
        if (fileActions[file.name]) {
            fileActions[file.name](file);
        }
    };
}

function handleJsonFile(file, dataUrl) {
    const base64Data = dataUrl.split(',')[1];
    const jsonContent = JSON.parse(atob(base64Data));

    if (fileActions[file.name]) {
        fileActions[file.name](jsonContent);
    } else if (jsonContent.hasOwnProperty('raceNumber')) {
        // TODO: dragons
    } else {
        console.log("Unrecognized JSON file content.", jsonContent);
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Load a static image and return a texture promise
function loadStaticImage(imagePath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);
            resolve(new THREE.CanvasTexture(canvas));
        };
        img.onerror = reject;
        img.src = imagePath;
    });
}

function applyMaterialPreset(material, preset) {
    material.clearcoat = preset.clearCoat
    material.clearcoatRoughness = preset.clearCoatRoughness
    material.metalness = preset.metallic
    material.roughness = preset.baseRoughness
    material.needsUpdate = true;
    return material
}

async function convertImageToRGBChannels(imagePath) {
    const img = new Image();
    img.src = imagePath;

    // Wait for the image to load
    await new Promise((resolve) => {
        img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the original image to the canvas
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const createChannelImage = (channelIndex) => {
        const channelCanvas = document.createElement('canvas');
        const channelCtx = channelCanvas.getContext('2d');
        channelCanvas.width = canvas.width;
        channelCanvas.height = canvas.height;

        const channelData = channelCtx.createImageData(channelCanvas.width, channelCanvas.height);
        const channelPixels = channelData.data;

        for (let i = 0; i < data.length; i += 4) {
            const value = data[i + channelIndex]; // Red, Green, or Blue

            // Set the channel color to white (255,255,255) if it has intensity, otherwise keep transparent
            channelPixels[i] = value > 0 ? 255 : 0;     // R
            channelPixels[i + 1] = value > 0 ? 255 : 0; // G
            channelPixels[i + 2] = value > 0 ? 255 : 0; // B
            channelPixels[i + 3] = value > 0 ? data[i + 3] : 0; // Preserve original alpha for active pixels, else 0
        }

        channelCtx.putImageData(channelData, 0, 0);
        return channelCanvas.toDataURL('image/png');
    };

    // Create images for the red, green, and blue channels
    const redImage = createChannelImage(0);   // Red channel
    const greenImage = createChannelImage(1); // Green channel
    const blueImage = createChannelImage(2);  // Blue channel

    // Return an array of object URLs
    return [redImage, greenImage, blueImage];
}


function changeMaterialColor(materialName, hexColor) {
    // Convert hex color string to THREE.Color
    const color = new THREE.Color(hexColor);

    // Traverse all objects in the scene
    scene.traverse((object) => {
        // Check if the object has a material and if it's an instance of Mesh
        if (object.isMesh && object.material) {
            // Check if the material has a name that matches the specified name
            if (object.material.name === materialName) {
                // Change the material color
                object.material.color = color
                // Optionally, you can also update the material if necessary
                object.material.needsUpdate = true;
                console.log(`Changed color of material '${materialName}' to ${hexColor}`);
            }
        }
    });
}

function applyBodyColours() {
    for (let i = 0; i < bodyColours.length; i++) {
        changeMaterialColor(`baseLivery${i + 1}`, bodyColours[i]);
    }
}

// Initialize
init();