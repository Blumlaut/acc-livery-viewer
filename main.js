import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let firstRun = true
// Flag that indicates when the viewer has finished loading a model
window.viewerReady = false

let scene, camera, renderer, model, prevModelPath, curModelPath, envMap, currentLivery

let extraMeshes = []
let wheelMeshes = []
let bodyColours = [ "#ff0000", "#00ff00", "#0000ff", "#fafafa" ]
let bodyMaterials = ["glossy", "glossy", "glossy", "glossy"]
let bodyTextures = []
let LodLevel = 3

let currentSkybox = cubemaps[0]
let skyboxState = false

const whiteCanvas = document.createElement('canvas');
whiteCanvas.width = whiteCanvas.height = 1;
const whiteCtx = whiteCanvas.getContext('2d');
whiteCtx.fillStyle = '#ffffff';
whiteCtx.fillRect(0, 0, 1, 1);
const defaultOverlay = new THREE.CanvasTexture(whiteCanvas);

function setupCarpaintMaterial(material) {
    material.defines = material.defines || {};
    // Ensure we use the same UVs for overlays as the base texture
    delete material.defines.USE_UV2;

    material.userData.overlayUniforms = {
        overlayMap1: { value: defaultOverlay },
        overlayMap2: { value: defaultOverlay },
        overlayMap3: { value: defaultOverlay },
        decalMap: { value: defaultOverlay },
        sponsorMap: { value: defaultOverlay },
        overlayColor1: { value: new THREE.Color(bodyColours[0]) },
        overlayColor2: { value: new THREE.Color(bodyColours[1]) },
        overlayColor3: { value: new THREE.Color(bodyColours[2]) },
        whiteTexture: defaultOverlay
    };

    material.onBeforeCompile = (shader) => {
        shader.uniforms.overlayMap1 = material.userData.overlayUniforms.overlayMap1;
        shader.uniforms.overlayMap2 = material.userData.overlayUniforms.overlayMap2;
        shader.uniforms.overlayMap3 = material.userData.overlayUniforms.overlayMap3;
        shader.uniforms.decalMap = material.userData.overlayUniforms.decalMap;
        shader.uniforms.sponsorMap = material.userData.overlayUniforms.sponsorMap;
        shader.uniforms.overlayColor1 = material.userData.overlayUniforms.overlayColor1;
        shader.uniforms.overlayColor2 = material.userData.overlayUniforms.overlayColor2;
        shader.uniforms.overlayColor3 = material.userData.overlayUniforms.overlayColor3;

        const uniformDecl = `
uniform sampler2D overlayMap1;
uniform sampler2D overlayMap2;
uniform sampler2D overlayMap3;
uniform sampler2D decalMap;
uniform sampler2D sponsorMap;
uniform vec3 overlayColor1;
uniform vec3 overlayColor2;
uniform vec3 overlayColor3;
`;
        shader.fragmentShader = uniformDecl + shader.fragmentShader;

        const mixFrag = `
#ifdef USE_MAP
    vec4 baseCol = texture2D(map, vMapUv);
#else
    vec4 baseCol = vec4(1.0);
#endif
    float mask1 = texture2D(overlayMap1, vMapUv).r;
    float mask2 = texture2D(overlayMap2, vMapUv).r;
    float mask3 = texture2D(overlayMap3, vMapUv).r;
    vec4 finalCol = vec4(baseCol.rgb, 1.0);
    finalCol.rgb = mix(finalCol.rgb, overlayColor1, mask1);
    finalCol.rgb = mix(finalCol.rgb, overlayColor2, mask2);
    finalCol.rgb = mix(finalCol.rgb, overlayColor3, mask3);
    finalCol *= texture2D(decalMap, vMapUv);
    finalCol *= texture2D(sponsorMap, vMapUv);
    diffuseColor *= finalCol;
`;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `${mixFrag}\n#include <output_fragment>`
        );
    };
    material.needsUpdate = true;
}


function loadSettingsCookies() {

    getCookie('lodLevel') ? LodLevel = parseInt(getCookie('lodLevel')) : null

    if (getCookie("skybox")) {
        currentSkybox = getCookie("skybox")
        const cubemapSelector = document.getElementById('cubemapSelector')
        cubemapSelector.value = currentSkybox
    }

    if (getCookie("skyboxActive")) {
        skyboxState = (getCookie("skyboxActive") == "true" || false)
        const skyboxToggle = document.getElementById('skybox-toggle')
        skyboxToggle.checked = skyboxState
    }

    if (getCookie("model")) {
        firstRun = false
        curModelPath = getCookie("model")
        prevModelPath = curModelPath
        const modelSelector = document.getElementById('modelSelector');
        modelSelector.value = curModelPath
        populateLiverySelector(curModelPath)
    }
    if (getCookie("currentLivery")) {
        currentLivery = getCookie("currentLivery")
        const liverySelector = document.getElementById('liverySelector');
        console.log("set livery selector to ",currentLivery)
        liverySelector.value = currentLivery
    }

    if (getCookie('lodLevel')) {
        LodLevel = getCookie('lodLevel')
        lodSelector.value = LodLevel
    }

    if (getCookie("materialPreset_baseLivery1")) {
        bodyMaterials[0] = getCookie("materialPreset_baseLivery1")
        const layer1Material = document.getElementById('layer1Material')
        layer1Material.value = bodyMaterials[0]
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[0]])
    }
    if (getCookie("materialPreset_baseLivery2")) {
        bodyMaterials[1] = getCookie("materialPreset_baseLivery2")
        const layer2Material = document.getElementById('layer2Material')
        layer2Material.value = bodyMaterials[1]
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[1]])
    }
    if (getCookie("materialPreset_baseLivery3")) {
        bodyMaterials[2] = getCookie("materialPreset_baseLivery3")
        const layer3Material = document.getElementById('layer3Material')
        layer3Material.value = bodyMaterials[2]
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[2]])
    }
    if (getCookie("rimMaterial")) {
        bodyMaterials[3] = getCookie("rimMaterial")
        const rimMaterial = document.getElementById('rimMaterial')
        rimMaterial.value = bodyMaterials[3]
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    }

    if (getCookie("materialColor_baseLivery1")) {
        bodyColours[0] = coloridToHex(getCookie("materialColor_baseLivery1"))
        const layer1Color = document.getElementById('layer1Color')
        layer1Color.setValue(bodyColours[0])
    }

    if (getCookie("materialColor_baseLivery2")) {
        bodyColours[1] = coloridToHex(getCookie("materialColor_baseLivery2"))
        const layer2Color = document.getElementById('layer2Color')
        layer2Color.setValue(bodyColours[1])
    }

    if (getCookie("materialColor_baseLivery3")) {
        bodyColours[2] = coloridToHex(getCookie("materialColor_baseLivery3"))
        const layer3Color = document.getElementById('layer3Color')
        layer3Color.setValue(bodyColours[2])
    }

    if (getCookie("rimColour")) {
        bodyColours[3] = coloridToHex(getCookie("rimColour"))
        const rimColour = document.getElementById('rimColor')
        rimColour.setValue(bodyColours[3])
        changeMaterialColor(`EXT_RIM`, bodyColours[3]);
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    }


}

function init() {

    // Populate Selectors
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

    // Create the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,
        preserveDrawingBuffer: true // allow canvas export via toDataURL
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('modelContainer').appendChild(renderer.domElement);
    console.log("loading cookies")
    loadSettingsCookies()
    console.log("done loading cookies")

    const urlParams = new URLSearchParams(window.location.search);
    const sideCamera = urlParams.has('sideCamera');
    const hasQueryParams = Array.from(urlParams.keys()).length > 0;

    if (hasQueryParams) {
        ['settingsLayer', 'liveryLayer', 'overlay'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    if (urlParams.has('carId')) {
        const carInfo = cars[urlParams.get('carId')];
        if (carInfo && carInfo.modelKey) {
            curModelPath = carInfo.modelKey;
            modelSelector.value = curModelPath;
            populateLiverySelector(curModelPath);
        }
    } else if (urlParams.has('model')) {
        curModelPath = urlParams.get('model');
        modelSelector.value = curModelPath;
        populateLiverySelector(curModelPath);
    }
    if (urlParams.has('livery')) {
        currentLivery = urlParams.get('livery');
        const liverySelector = document.getElementById('liverySelector');
        liverySelector.value = currentLivery;
    }

    if (urlParams.has('carJson')) {
        const carUrl = urlParams.get('carJson');
        fetch(carUrl)
            .then(resp => resp.json())
            .then(data => {
                applyCarJsonData(data);
            })
            .catch(err => console.error('Failed to load carJson', err));
    }

    setSkybox(scene, currentSkybox);


    const skyboxToggle = document.getElementById('skybox-toggle');
    //skyboxToggle.setAttribute("checked", skyboxState);
    skyboxToggle.addEventListener('change', () => {
        skyboxState = skyboxToggle.checked;
        setCookie("skyboxActive", skyboxToggle.checked)
        if (skyboxToggle.checked) {
            setSkybox(scene, currentSkybox);
        } else {
            scene.background = null;
        }
    });

    // Load the initial model
    console.log(`loading model ${curModelPath || Object.keys(modelFiles)[0]}`)
    loadModel(curModelPath || Object.keys(modelFiles)[0]); // Load the first model initially

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    //const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
    //scene.add(directionalLight);
    const hemiLight = new THREE.HemisphereLight( 0x0000ff, 0x00ff00, 0.6 ); 
    scene.add(hemiLight)

    // Set camera position
    camera.position.z = 4;
    camera.position.x= 0;
    camera.position.y = 1;
    if (!sideCamera) {
        // Add OrbitControls for camera control
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.update();
        scene.rotation.y = Math.PI / 4;
    } else {
        // Place camera to the side and look at the car
        camera.position.set(6, 1, 0);
        camera.lookAt(0, 1, 0);
    }

    
    // Handle model change
    modelSelector.addEventListener('change', (event) => {
        curModelPath = event.target.value;
        loadModel(curModelPath);
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
        setCookie('lodLevel', LodLevel);
        loadModel(curModelPath || Object.keys(modelFiles)[0])
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
        setCookie("rimColour", findColorId(bodyColours[3]))
        changeMaterialColor(`EXT_RIM`, bodyColours[3]);
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    });

    const layer1Material = document.getElementById('layer1Material');
    layer1Material.addEventListener('change', (event) => {
        bodyMaterials[0] = event.target.value;
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[event.target.value])
        setCookie(`materialPreset_baseLivery1`, bodyMaterials[0]);
    });

    const layer2Material = document.getElementById('layer2Material');
    layer2Material.addEventListener('change', (event) => {
        bodyMaterials[1] = event.target.value;
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[event.target.value])
        setCookie(`materialPreset_baseLivery2`, bodyMaterials[1]);
    });

    const layer3Material = document.getElementById('layer3Material');
    layer3Material.addEventListener('change', (event) => {
        bodyMaterials[2] = event.target.value;
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[event.target.value])
        setCookie(`materialPreset_baseLivery3`, bodyMaterials[2]);
    });


    const rimMaterial = document.getElementById('rimMaterial');
    rimMaterial.addEventListener('change', (event) => {
        bodyMaterials[3] = event.target.value;
        setCookie("rimMaterial", bodyMaterials[3])
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
    setCookie('skybox', folderName)
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
    // Reset ready flag while we load a new model
    window.viewerReady = false
    // Remove the existing model if it exists
    setCookie('model', modelPath)

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

    for (let i = 0; i < wheelMeshes.length; i++) {
        scene.remove(wheelMeshes[i]);
        wheelMeshes[i].traverse((node) => {
            if (node.isMesh) {
                cleanupMesh(node);
            }
        })

    }
    // Load new GLTF model
    const loader = new GLTFLoader();

    let fullFilePath = `models/${modelPath}/${modelFiles[modelPath]}_Lod${LodLevel}.gltf`

    loader.load(fullFilePath, async (gltf) => {
        model = gltf.scene;
        scene.add(model);
        // iterate through all materials and apply their texture from textures/*.png
        model.traverse((node) => {
            if (LodLevel < 3) {
                for (const [model, wheel] of Object.entries(wheelNodes)) {
                    if (node.name === wheel) {
                        loadWheelModel(node, model, modelPath)
                    }
                }
            }
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
                                color: bodyColours[3],
                             });
                             node.material = newMaterial;
                             applyMaterialPreset(node.material, paintMaterials["glossy"])

                        }
                    } else if (node.material.name.startsWith('EXT_Emissive') || node.material.name.startsWith('EXT_Glass') || node.material.name.startsWith('EXT_Window')) {
                        const newMaterial = new THREE.MeshPhysicalMaterial({ 
                            transmission: 1,
                            color: 0xffffff,
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
                        let texturePath = `models/${modelPath}/textures/${materialName}_Colour.png`;
                        if (materialName === "EXT_Carpaint_Inst") {
                            texturePath = `models/${modelPath}/textures/EXT_Skin_Colour.png`;
                        }
                        const textureLoader = new THREE.TextureLoader();
                        textureLoader.load(texturePath, (texture) => {
                            texture.flipY = false;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            bodyTextures.push(texture)
                            let newMaterial;
                            if (materialName === "EXT_Carpaint_Inst") {
                                newMaterial = new THREE.MeshPhysicalMaterial({
                                    name: node.material.name,
                                    map: texture,
                                    color: 0xffffff
                                });
                                setupCarpaintMaterial(newMaterial);
                            } else {
                                newMaterial = new THREE.MeshBasicMaterial({
                                    name: materialName,
                                    color: 0xffffff,
                                    map: texture
                                });
                            }
                            node.material = newMaterial;
                        },
                        undefined,
                        (error) => {
                            const newMaterial = new THREE.MeshPhysicalMaterial({
                                name: node.material.name,
                                color: 0x444444,
                             });
                            node.material = newMaterial;
                        });
                    }
                }
            }
        });


        if (curModelPath != prevModelPath || firstRun) {
            firstRun = false
            populateLiverySelector(modelPath)
            prevModelPath = curModelPath
        }
        curModelPath = modelPath
        await mergeAndSetDecals()
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[0]])
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[1]])
        applyMaterialPreset("EXT_Carpaint_Inst", paintMaterials[bodyMaterials[2]])
        applyMaterialPreset(`EXT_RIM`, paintMaterials[bodyMaterials[3]])
    });
}


var decalsFile = null;
var sponsorsFile = null;

async function setBaseLivery(modelPath, livery) {
    const liveryData = baseLiveries[modelPath][livery];
    currentLivery = livery
    console.log(`CurrentLivery is ${currentLivery}`)
    if (!liveryData) return;
    const liveryPath = liveryData.path;
    setCookie('currentLivery', livery || 100);
    let images
    if (liveryData.sponsor) {
        images = await convertImageToRGBChannels(`models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Sponsors.png`)
    } else {
        images = await convertImageToRGBChannels(`models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Custom.png`)
    }
    // iterate through images
    for (let i = 0; i < images.length; i++) {
        let image = images[i];
        await drawImageOverlay(image, "baseLivery"+(i+1), paintMaterials.customDecal || paintMaterials.glossy)
    }

    if (liveryData.hasDecals) {
        await drawImageOverlay(`models/${modelPath}/skins/custom/${liveryPath}/EXT_Skin_Decals.png`, "fanatec_overlay", paintMaterials.glossy)
    }
    applyBodyColours()
}

function cleanupPreviousMeshes() {
    bodyTextures.forEach(texture => {
        texture.dispose();
    });
    const mat = getMaterialFromName('EXT_Carpaint_Inst')[0];
    if (mat && mat.userData.overlayUniforms) {
        const w = mat.userData.overlayUniforms.whiteTexture;
        mat.userData.overlayUniforms.overlayMap1.value = w;
        mat.userData.overlayUniforms.overlayMap2.value = w;
        mat.userData.overlayUniforms.overlayMap3.value = w;
        mat.userData.overlayUniforms.decalMap.value = w;
        mat.userData.overlayUniforms.sponsorMap.value = w;
        mat.needsUpdate = true;
    }
}

function cleanupMesh(mesh) {
    scene.remove(mesh)
    if (mesh.material.map) {
        mesh.material.map.dispose();
    }
    mesh.material.dispose();
    scene.remove(mesh);
    mesh.geometry.dispose();
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
    model.traverse((node) => {
        if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
            if (!node.material.userData.overlayUniforms) {
                setupCarpaintMaterial(node.material);
            }
            const uniforms = node.material.userData.overlayUniforms;
            switch (materialName) {
                case "baseLivery1":
                    uniforms.overlayMap1.value = texture;
                    applyMaterialPreset(node.material, preset);
                    break;
                case "baseLivery2":
                    uniforms.overlayMap2.value = texture;
                    applyMaterialPreset(node.material, preset);
                    break;
                case "baseLivery3":
                    uniforms.overlayMap3.value = texture;
                    applyMaterialPreset(node.material, preset);
                    break;
                case "DecalMaterial":
                    uniforms.decalMap.value = texture;
                    break;
                case "SponsorMaterial":
                    uniforms.sponsorMap.value = texture;
                    break;
            }
            node.material.needsUpdate = true;
        }
    });
    return texture;
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
        applyTextureToModel(decalTexture, materialName, material);
        console.log("finished drawing overlay for "+materialName)
        return decalTexture
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
    window.viewerReady = true
    window.dispatchEvent(new Event('viewer-ready'))
}

function loadWheelModel(node, model, modelPath) {
    try {
        const loader = new GLTFLoader();
        const actualModelName = modelFiles[modelPath].replace("_sprint", "").replace("_exterior", "");
        loader.load(`models/${modelPath}/${actualModelName}_${model}_Lod1.gltf`, (gltf) => {
            const wheelModel = gltf.scene;
            const wheelObject = wheelModel.children[0];
            wheelModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    const newMaterial = new THREE.MeshPhysicalMaterial({ 
                        name: child.material.name,
                        color: bodyColours[3],
                        side: THREE.DoubleSide
                    });
                    
                    child.material = newMaterial;
                    applyMaterialPreset(child.material, paintMaterials[bodyMaterials[3]])
                }
            })
            
            
            scene.add(wheelObject);
            wheelMeshes.push(wheelObject);
            // move and rotate wheel model according to node position/rotation
            wheelObject.rotation.copy(node.rotation);
            wheelObject.position.copy(node.position);
        }, undefined, function(err) {
            console.log(err)
            console.log(`Wheel Model missing (or errored) for ${modelPath}, loading placeholder..`);
            loadWheelModel(node, model,"bmw_m4_gt3")
        })
    } catch (e)
    {
        console.log(e)
    }
}


const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
        fileInput.files = event.dataTransfer.files;

        handleFileUpload({target: {
            files: [...event.dataTransfer.files]
        }});
      }
  });



document.getElementById('multiFileUpload').addEventListener('change', handleFileUpload);

const fileActions = {
    'decals.png': file => { decalsFile = URL.createObjectURL(file); },
    'sponsors.png': file => { sponsorsFile = URL.createObjectURL(file); },
    'decals.json': content => { paintMaterials.customDecal = content; },
    'sponsors.json': content => { paintMaterials.customSponsor = content; },
    'car.json': content => { applyCarJsonData(content); }
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
        applyCarJsonData(jsonContent);
    } else {
        console.log("Unrecognized JSON file content.", jsonContent);
    }
}



const modelsElement = document.getElementById('models');
const texturesElement = document.getElementById('textures');
const polygonsElement = document.getElementById('polygons');
const drawCallsElement = document.getElementById('drawCalls');
const loadedCarElement = document.getElementById('loadedCar');
const skinIdElement = document.getElementById('skinId');
const skinColoursElement = document.getElementById('skinColours');
function animate() {
    const info = renderer.info;

    // Update overlay text with performance stats
    modelsElement.innerText = `Models: ${info.memory.geometries}`;
    texturesElement.innerText = `Textures: ${info.memory.textures}`;
    polygonsElement.innerText = `Polygons: ${info.render.triangles}`;
    drawCallsElement.innerText = `Draw Calls: ${info.render.calls}`;
    const carInfo = Object.values(cars).find(c => c.modelKey === curModelPath);
    loadedCarElement.innerText = `Car: ${carInfo ? carInfo.model : curModelPath}`
    if (currentLivery) {
        skinIdElement.innerText = `Skin ID: ${currentLivery}`
    }
    
    skinColoursElement.innerText = `Colours: ${findColorId(bodyColours[0])}, ${findColorId(bodyColours[1])}, ${findColorId(bodyColours[2])}, ${findColorId(bodyColours[3])}`



    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function applyMaterialPreset(material, preset) {
    if (typeof(material) == "string") {
        material = getMaterialFromName(material);
    }
    if (material) {
        if (material.id) {
            material.clearcoat = preset.clearCoat
            material.clearcoatRoughness = preset.clearCoatRoughness
            material.metalness = preset.metallic
            material.roughness = preset.baseRoughness
            material.needsUpdate = true;
            return material
        } else {
            for (let i = 0; i < material.length; i++) {
                applyMaterialPreset(material[i], preset);
            }
        }
    }
    return false
}

function getMaterialFromName(materialName) {
    let returnMat = []
    scene.traverse((object) => {
        // Check if the object has a material and if it's an instance of Mesh
        if (object.material) {
            // Check if the material has a name that matches the specified name
            if (object.material.name == materialName) {
                returnMat.push(object.material)
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

function applyCarJsonData(data) {
    if (data.skinColor1Id !== undefined) {
        bodyColours[0] = coloridToHex(data.skinColor1Id);
        document.getElementById('layer1Color').setValue(bodyColours[0]);
    }
    if (data.skinColor2Id !== undefined) {
        bodyColours[1] = coloridToHex(data.skinColor2Id);
        document.getElementById('layer2Color').setValue(bodyColours[1]);
    }
    if (data.skinColor3Id !== undefined) {
        bodyColours[2] = coloridToHex(data.skinColor3Id);
        document.getElementById('layer3Color').setValue(bodyColours[2]);
    }
    if (data.rimColor1Id !== undefined) {
        bodyColours[3] = coloridToHex(data.rimColor1Id);
        document.getElementById('rimColor').setValue(bodyColours[3]);
    }

    if (data.skinMaterialType1 !== undefined && materialIdToName[data.skinMaterialType1]) {
        bodyMaterials[0] = materialIdToName[data.skinMaterialType1];
        document.getElementById('layer1Material').value = bodyMaterials[0];
    }
    if (data.skinMaterialType2 !== undefined && materialIdToName[data.skinMaterialType2]) {
        bodyMaterials[1] = materialIdToName[data.skinMaterialType2];
        document.getElementById('layer2Material').value = bodyMaterials[1];
    }
    if (data.skinMaterialType3 !== undefined && materialIdToName[data.skinMaterialType3]) {
        bodyMaterials[2] = materialIdToName[data.skinMaterialType3];
        document.getElementById('layer3Material').value = bodyMaterials[2];
    }
    if (data.rimMaterialType1 !== undefined && materialIdToName[data.rimMaterialType1]) {
        bodyMaterials[3] = materialIdToName[data.rimMaterialType1];
        document.getElementById('rimMaterial').value = bodyMaterials[3];
    }

    applyBodyColours();
}

function applyBodyColours() {
    const mat = getMaterialFromName('EXT_Carpaint_Inst')[0];
    if (mat && mat.userData.overlayUniforms) {
        mat.userData.overlayUniforms.overlayColor1.value.set(bodyColours[0]);
        mat.userData.overlayUniforms.overlayColor2.value.set(bodyColours[1]);
        mat.userData.overlayUniforms.overlayColor3.value.set(bodyColours[2]);
        mat.needsUpdate = true;
    }
    for (let i = 0; i < 3; i++) {
        setCookie(`materialColor_baseLivery${i + 1}`, findColorId(bodyColours[i]));
        setCookie(`materialPreset_baseLivery${i + 1}`, bodyMaterials[i]);
    }
}

function populateLiverySelector(modelPath) {
    const liverySelector = document.getElementById('liverySelector');
    for (let a in liverySelector.options) { liverySelector.options.remove(0); }
    for (const [i, v] of Object.entries(baseLiveries[modelPath])) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = v.name;
        liverySelector.appendChild(option);
    }
}

// Allow external scripts (e.g., Puppeteer) to capture the current canvas
// as a PNG data URL.
window.captureImage = function () {
    return renderer.domElement.toDataURL('image/png');
};


// Initialize
init();
