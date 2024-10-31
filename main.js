import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const modelsElement = document.getElementById('models');
const texturesElement = document.getElementById('textures');
const polygonsElement = document.getElementById('polygons');
const drawCallsElement = document.getElementById('drawCalls');
const memoryElement = document.getElementById('memory');


let scene, camera, renderer, model, curModelPath, selectedModel, envMap

let extraMeshes = []
let bodyColours = [ "#ff0000", "#00ff00", "#0000ff", "#ffffff" ]
let bodyMaterials = ["glossy", "glossy", "glossy", "glossy"]
let bodyTextures = []
let LodLevel = 3

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
    for (const [folder, file] of Object.entries(modelFiles)) {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        modelSelector.appendChild(option);
    };

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
    loadModel(Object.keys(modelFiles)[0]); // Load the first model initially

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
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
        selectedModel = event.target.value;
        loadModel(selectedModel);
    });


    cubemapSelector.addEventListener('change', (event) => {
        const selectedCubemap = event.target.value;
        setSkybox(scene, selectedCubemap)
    });


    const liverySelector = document.getElementById('liverySelector');
    liverySelector.addEventListener('change', (event) => {
        mergeAndSetDecals()
    });

    const lodSelector = document.getElementById('lodSelector');
    lodSelector.addEventListener('change', (event) => {
        LodLevel = event.target.value;
        loadModel(selectedModel || Object.keys(modelFiles)[0])
    });


    const unloadLiveryBtn = document.getElementById('unloadCustomLivery');
    unloadLiveryBtn.addEventListener('click', () => {
        cleanupPreviousMeshes()
        decalsFile = undefined;
        sponsorsFile = undefined;
        paintMaterials.customDecal = undefined;
        paintMaterials.customSponsor = undefined;
        mergeAndSetDecals()
    });

    const layer1Color = document.getElementById('layer1Color');
    layer1Color.addEventListener('change', (event) => {
        bodyColours[0] = event.target.value;
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

    const rimColor = document.getElementById('rimColor');
    rimColor.addEventListener('change', (event) => {
        bodyColours[3] = event.target.value;
        changeMaterialColor(`EXT_RIM`, bodyColours[3]);
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    });

    const layer1Material = document.getElementById('layer1Material');
    layer1Material.addEventListener('change', (event) => {
        bodyMaterials[0] = event.target.value;
        applyMaterialPreset("baseLivery1", paintMaterials[event.target.value])
    });

    const layer2Material = document.getElementById('layer2Material');
    layer2Material.addEventListener('change', (event) => {
        bodyMaterials[1] = event.target.value;
        applyMaterialPreset("baseLivery2", paintMaterials[event.target.value])
    });

    const layer3Material = document.getElementById('layer3Material');
    layer3Material.addEventListener('change', (event) => {
        bodyMaterials[2] = event.target.value;
        applyMaterialPreset("baseLivery3", paintMaterials[event.target.value])
    });


    const rimMaterial = document.getElementById('rimMaterial');
    rimMaterial.addEventListener('change', (event) => {
        bodyMaterials[3] = event.target.value;
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    });


    

    // Animation loop
    animate();
}

function setSkybox(scene, folderName) {
    const cubeMapLoader = new THREE.CubeTextureLoader();
    const directions = ['negx', 'posx', 'posy', 'negy', 'negz', 'posz'];

    // unload current envMap
    scene.environment = null;
    scene.background = null;
    if (envMap) envMap.dispose();
    

    // Load the cubemap textures directly using CubeTextureLoader
    envMap = cubeMapLoader.load(
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
                if (node.isMesh) {
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
        cleanupPreviousMeshes()
        model.traverse((node) => {
            if (node.isMesh) {
                // dispose textures
                node.geometry.dispose();
                if (node.material.isMaterial) {
                    node.material.dispose();
                } else {
                    // Dispose of each material
                    node.material.forEach(material => material.dispose());
                }
            }
        });
    }

    // Load new GLTF model
    const loader = new GLTFLoader();

    let fullFilePath = `models/${modelPath}/${modelFiles[modelPath]}_Lod${LodLevel}.gltf`

    loader.load(fullFilePath, (gltf) => {
        model = gltf.scene;
        scene.add(model);
        curModelPath = modelPath
        // iterate through all materials and apply their texture from textures/*.png
        model.traverse((node) => {
            if (node.isMesh && node.material) {
                if (node.material.name && node.material.name.startsWith('EXT_')) {
                    
                    if (node.material.name.startsWith("EXT_RIM")) {
                        let materialName = node.material.name
                        if (materialName.startsWith("EXT_RIM_BLUR")) {
                            // hide object
                            node.visible = false;
                        } else {
                            const newMaterial = new THREE.MeshPhysicalMaterial({ 
                                name: materialName,
                                color: 0xffffff,
                             });
                             node.material = newMaterial;
                             applyMaterialPreset(node.material, paintMaterials["glossy"])

                        }
                    } else if (node.material.name.startsWith('EXT_Emissive') || node.material.name.startsWith('EXT_Glass') || node.material.name.startsWith('EXT_Window')) {
                        const newMaterial = new THREE.MeshPhysicalMaterial({ 
                            transmission: 1,
                            roughness: 0.0,
                            thickness: 0,
                            dispersion: 0
                         });
                         node.material = newMaterial;

                    } else {
                        let materialName = node.material.name
                        if (materialName == "EXT_RIM") {
                            materialName = "EXT_Rim"
                        }
                        const texturePath = `models/${modelPath}/textures/${materialName}_Colour.png`;
                        const textureLoader = new THREE.TextureLoader();
                        textureLoader.load(texturePath, (texture) => {
                            texture.flipY = false;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            bodyTextures.push(texture)
                            const newMaterial = new THREE.MeshBasicMaterial({ 
                                name: materialName,
                                color: 0xffffff,
                                map: texture

                             });
                            
                            // apply the new material to the mesh
                            node.material = newMaterial;
                        },
                        undefined, // onProgress callback, can be omitted if not needed
                        (error) => {
                            console.error(`Failed to load texture: ${texturePath}`, error);
                        });
                    }
                }
            }
        });

        const liverySelector = document.getElementById('liverySelector');
        for (let a in liverySelector.options) { liverySelector.options.remove(0); }
        for (let i = 1; i < baseLiveries[modelPath] + 1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = "Skin " + i;
            liverySelector.appendChild(option);
        }
        mergeAndSetDecals()
    });
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
}

function cleanupPreviousMeshes() {
    extraMeshes.forEach(mesh => {
        mesh.material.map.dispose();
        mesh.material.dispose();
        scene.remove(mesh)
    });
    bodyTextures.forEach(texture => {
        texture.dispose();
    })
    scene.traverse((child) => {
        if (child.isMesh && (child.material.name === "SponsorMaterial" || child.material.name === "DecalMaterial")) {
            child.material.map.dispose();
            child.material.dispose();
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
    texture.anisotropy = 8;
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
    cleanupPreviousMeshes();
    await setBaseLivery(curModelPath, liverySelector.value)
    const canvas = document.getElementById('hiddenCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    const info = renderer.info;

    // Update overlay text with performance stats
    modelsElement.innerText = `Models: ${info.memory.geometries}`;
    texturesElement.innerText = `Textures: ${info.memory.textures}`;
    polygonsElement.innerText = `Polygons: ${info.render.triangles}`;
    drawCallsElement.innerText = `Draw Calls: ${info.render.calls}`;
    memoryElement.innerText = `Memory: ${(info.memory.programs || []).length} programs`;

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function applyMaterialPreset(material, preset) {
    if (typeof(material) == "string") {
        material = getMaterialFromName(material);
    }
    if (material) {
        material.clearcoat = preset.clearCoat
        material.clearcoatRoughness = preset.clearCoatRoughness
        material.metalness = preset.metallic
        material.roughness = preset.baseRoughness
        material.needsUpdate = true;
        return material
    }
    return false
}

function getMaterialFromName(materialName) {
    let returnMat
    scene.traverse((object) => {
        // Check if the object has a material and if it's an instance of Mesh
        if (object.material) {
            // Check if the material has a name that matches the specified name
            if (object.material.name == materialName) {
                returnMat = object.material
            }
        }
    });
    return returnMat
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
            const alpha = data[i + 3]; // Original alpha

            // Set the channel color to white (255,255,255) if it has intensity, otherwise keep transparent
            channelPixels[i] = value > 0 ? 255 : 0;     // R
            channelPixels[i + 1] = value > 0 ? 255 : 0; // G
            channelPixels[i + 2] = value > 0 ? 255 : 0; // B
            channelPixels[i + 3] = Math.min(alpha, value);          // Scale alpha based on intensity
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
        applyMaterialPreset(`baseLivery${i + 1}`, paintMaterials[bodyMaterials[i]])
    }
}

  

// Initialize
init();
