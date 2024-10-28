import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


let scene, camera, renderer, model, curModelPath, envMap, decalMesh, sponsorMesh;


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
        paintMaterials.customDecal = undefined;
        paintMaterials.customSponsor = undefined;
        setBaseLivery(curModelPath, liverySelector.value);
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
        scene.remove(decalMesh)
        scene.remove(sponsorMesh)
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

function setBaseLivery(modelPath, liveryId) {
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
    scene.remove(decalMesh)
    scene.remove(sponsorMesh)
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

async function drawDecals() {
    if (!decalsFile) {
        console.log("Decals missing, skipping decals layer.");
        return;
    }
    try {
        const imgDecal = await loadImage(decalsFile);
        const decalCanvas = setupCanvas(imgDecal);
        const decalCtx = decalCanvas.getContext('2d');
        decalCtx.drawImage(imgDecal, 0, 0);
        const decalTexture = createTextureFromCanvas(decalCanvas);
        decalMesh = applyTextureToModel(decalTexture, "DecalMaterial", paintMaterials.customDecal || paintMaterials.glossy);
    } catch (error) {
        console.error(error);
    }
}

async function drawSponsors() {
    if (!sponsorsFile) {
        console.log("Sponsors missing, using just the decals.");
        return;
    }
    try {
        const imgSponsor = await loadImage(sponsorsFile);
        const alphaCanvas = setupCanvas(imgSponsor);
        const alphaCtx = alphaCanvas.getContext('2d');
        alphaCtx.drawImage(imgSponsor, 0, 0);

        const combinedCanvas = setupCanvas(imgSponsor);
        const combinedCtx = combinedCanvas.getContext('2d');
        combinedCtx.drawImage(imgSponsor, 0, 0);

        const alphaData = alphaCtx.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height).data;
        const combinedData = combinedCtx.getImageData(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        for (let i = 0; i < combinedData.data.length; i += 4) {
            combinedData.data[i + 3] = alphaData[i + 3];
        }
        combinedCtx.putImageData(combinedData, 0, 0);

        const sponsorTexture = createTextureFromCanvas(combinedCanvas);
        sponsorMesh = applyTextureToModel(sponsorTexture, "SponsorMaterial", paintMaterials.customSponsor || paintMaterials.matte);
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
        await drawDecals();
        await drawSponsors();
    } catch (error) {
        console.error(error);
    }
}





document.getElementById('multiFileUpload').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = function(e) {
				// check if the file is an image
				if (e.target.result.match(/image/i)) {
					const img = new Image();
					img.src = e.target.result;
					img.onload = function() {
						// Create object URL for the image and set it based on its filename
						if (file.name === "decals.png") {
							decalsFile = URL.createObjectURL(file);
						} else if (file.name === "sponsors.png") {
							sponsorsFile = URL.createObjectURL(file);
						}
					};
				} else {
					console.log("File is not an image.", e);
					// decode result from data:application/json;base64 to get the actual file content
					const base64Data = e.target.result.split(',')[1];
					const jsonContent = JSON.parse(atob(base64Data));
					if (file.name === "decals.json") {
						paintMaterials.customDecal = jsonContent
					} else if (file.name === "sponsors.json") {
						paintMaterials.customSponsor = jsonContent
					}
				}
            };
            reader.readAsDataURL(file);
        }
    }
	setTimeout(() => {
		mergeAndSetDecals();
	}, 300)
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

// Initialize
init();