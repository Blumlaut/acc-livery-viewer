import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, model, curModelPath, envMap, sponsorMesh;

let modelFiles = [
    "alpine_a110_gt4",
    "amr_v12_vantage_gt3",
    "amr_v8_vantage_gt3",
    "amr_v8_vantage_gt4",
    "audi_r8_gt4",
    "audi_r8_lms",
    "audi_r8_lms_evo",
    "audi_r8_lms_gt2",
    "bentley_continental_gt3_2016",
    "bentley_continental_gt3_2018",
    "bmw_m2_cs_racing",
    "bmw_m4_gt3",
    "bmw_m4_gt4",
    "bmw_m6_gt3",
    "chevrolet_camaro_gt4r",
    "common",
    "ferrari_296_gt3",
    "ferrari_488_challenge_evo",
    "ferrari_488_gt3",
    "ferrari_488_gt3_evo",
    "ford_mustang_gt3",
    "ginetta_g55_gt4",
    "honda_nsx_gt3",
    "honda_nsx_gt3_evo",
    "jaguar_g3",
    "ktm_xbow_gt2",
    "ktm_xbow_gt4",
    "lamborghini_gallardo_rex",
    "lamborghini_huracan_gt3",
    "lamborghini_huracan_gt3_evo",
    "lamborghini_huracan_gt3_evo2",
    "lamborghini_huracan_st",
    "lamborghini_huracan_st_evo2",
    "lexus_rc_f_gt3",
    "maserati_mc20_gt2",
    "maserati_mc_gt4",
    "mclaren_570s_gt4",
    "mclaren_650s_gt3",
    "mclaren_720s_gt3",
    "mclaren_720s_gt3_evo",
    "mercedes_amg_gt2",
    "mercedes_amg_gt3",
    "mercedes_amg_gt3_evo",
    "mercedes_amg_gt4",
    "nissan_gt_r_gt3_2017",
    "nissan_gt_r_gt3_2018",
    "porsche_718_cayman_gt4_mr",
    "porsche_935",
    "porsche_991_gt3_r",
    "porsche_991ii_gt2_rs_cs_evo",
    "porsche_991ii_gt3_cup",
    "porsche_991ii_gt3_r",
    "porsche_992_gt3_cup",
    "porsche_992_gt3_r",
];

const cubemaps = [
    "overcast",
    "sunny",
    "sunset",
    "night",
]

const baseLiveries = {
    "alpine_a110_gt4": 3,
    "amr_v12_vantage_gt3": 10,
    "amr_v8_vantage_gt3": 10,
    "amr_v8_vantage_gt4": 3,
    "audi_r8_gt4": 4,
    "audi_r8_lms": 5,
    "audi_r8_lms_evo": 11,
    "audi_r8_lms_gt2": 5,
    "bentley_continental_gt3_2016": 5,
    "bentley_continental_gt3_2018": 10,
    "bmw_m2_cs_racing": 7,
    "bmw_m4_gt3": 10,
    "bmw_m4_gt4": 3,
    "bmw_m6_gt3": 10,
    "chevrolet_camaro_gt4r": 3,
    "common": 0,
    "ferrari_296_gt3": 10,
    "ferrari_488_challenge_evo": 5,
    "ferrari_488_gt3": 5,
    "ferrari_488_gt3_evo": 10,
    "ford_mustang_gt3": 5,
    "ginetta_g55_gt4": 3,
    "honda_nsx_gt3": 3,
    "honda_nsx_gt3_evo": 5,
    "jaguar_g3": 3,
    "ktm_xbow_gt2": 5,
    "ktm_xbow_gt4": 3,
    "lamborghini_gallardo_rex": 3,
    "lamborghini_huracan_gt3": 3,
    "lamborghini_huracan_gt3_evo": 5,
    "lamborghini_huracan_gt3_evo2": 11,
    "lamborghini_huracan_st": 5,
    "lamborghini_huracan_st_evo2": 10,
    "lexus_rc_f_gt3": 3,
    "maserati_mc20_gt2": 5,
    "maserati_mc_gt4": 3,
    "mclaren_570s_gt4": 3,
    "mclaren_650s_gt3": 3,
    "mclaren_720s_gt3": 2,
    "mclaren_720s_gt3_evo": 3,
    "mercedes_amg_gt2": 5,
    "mercedes_amg_gt3": 5,
    "mercedes_amg_gt3_evo": 10,
    "mercedes_amg_gt4": 4,
    "nissan_gt_r_gt3_2017": 4,
    "nissan_gt_r_gt3_2018": 5,
    "porsche_718_cayman_gt4_mr": 3,
    "porsche_935": 5,
    "porsche_991_gt3_r": 4,
    "porsche_991ii_gt2_rs_cs_evo": 5,
    "porsche_991ii_gt3_cup": 10,
    "porsche_991ii_gt3_r": 6,
    "porsche_992_gt3_cup": 10,
    "porsche_992_gt3_r": 10
}


let currentSkybox = cubemaps[0]
let skyboxState = false

function init() {
    // Create the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    camera.position.z = 5;
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
        console.log(event.target.value)
        setBaseLivery(curModelPath, event.target.value);
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
        model.traverse((node) => {
            if (node.isMesh && (node.material.name === "EXT_Carpaint_Inst" || node.material.name === "SponsorMaterial")) {
                node.material.envMap = envMap;
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

    let enduKitCars = [
        "amr_v12_vantage_gt3",
        "audi_r8_lms",
        "audi_r8_lms_evo",
        "bmw_m6_gt3",
        "ferrari_488_gt3",
        "ferrari_488_gt3_evo",
        "lamborghini_huracan_gt3",
        "lamborghini_huracan_gt3_evo",
        "lamborghini_huracan_gt3_evo2",
        "lexus_rc_f_gt3",
        "mclaren_650s_gt3",
        "mercedes_amg_gt3",
        "mercedes_amg_gt3_evo",
        "nissan_gt_r_gt3_2017",
        "nissan_gt_r_gt3_2018",
        "porsche_991_gt3_r"
    ]
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
        for (let i = 1; i < baseLiveries[modelPath]+1; i++) {
            console.log(i)
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
var decalsMats = {
	"baseRoughness": 0,
	"clearCoat": 1,
	"clearCoatRoughness": 0.01,
	"metallic": 0.9
};
var sponsorsFile = null;
var sponsorsMats = {
	"baseRoughness": 0,
	"clearCoat": 1,
	"clearCoatRoughness": 0.01,
	"metallic": 0.9
};

function setBaseLivery(modelPath, liveryId) {
    loadStaticImage(`models/${modelPath}/skins/custom/custom_${liveryId}/EXT_Skin_Custom.png`).then((texture) => {
        // Set texture properties
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;

        model.traverse((node) => {
            if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                const decalMaterial = new THREE.MeshPhysicalMaterial({
                    name: node.material.name,
                    color: 0xffffff,
                    clearcoat: 1,
                    clearcoatRoughness: 0.3,
                    metalness: 0.3,
                    roughness: 0,
                    envMap: envMap,
                    map: texture,
                    depthWrite: true,
                });

                node.material = decalMaterial;
                node.material.needsUpdate = true;
            }
        });
    });
}

function mergeAndSetDecals() {
    const canvas = document.getElementById('hiddenCanvas');
    const ctx = canvas.getContext('2d');

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Function to clean up existing sponsor meshes and reset materials
    const cleanupPreviousMeshes = () => {
        scene.children.forEach((child) => {
            if (child.isMesh && child.material.name === "SponsorMaterial") {
                scene.remove(child);
            }
        });

        model.traverse((node) => {
            if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                node.material.map = null; // Clear existing decal texture
                node.material.needsUpdate = true; // Notify Three.js to update the material
            }
        });
    };

    // Handle Decals
    const drawDecals = () => {
        if (decalsFile) {
            const imgDecal = new Image();
            imgDecal.src = decalsFile;

            return new Promise((resolve, reject) => {
                imgDecal.onload = () => {
                    console.log("Decal image loaded with dimensions:", imgDecal.width, imgDecal.height);
                    canvas.width = imgDecal.width;
                    canvas.height = imgDecal.height;
                    ctx.drawImage(imgDecal, 0, 0);

                    const decalTexture = new THREE.Texture(canvas);
                    decalTexture.flipY = false; // Ensure flipY is false
                    decalTexture.colorSpace = THREE.SRGBColorSpace; // Set color space
                    decalTexture.needsUpdate = true;

                    model.traverse((node) => {
                        if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                            node.material.map = decalTexture;
                            node.material.clearcoat = decalsMats.clearCoat;
                            node.material.clearcoatRoughness = decalsMats.clearCoatRoughness;
                            node.material.metalness = decalsMats.metallic;
                            node.material.roughness = decalsMats.baseRoughness;
                            node.material.needsUpdate = true; // Notify Three.js to update the material
                        }
                    });
                    resolve(); // Resolve when decals are drawn
                };

                imgDecal.onerror = () => {
                    console.error("Failed to load decal image");
                    reject("Failed to load decal image");
                };
            });
        } else {
            console.log("Decals missing, skipping decals layer.");
            return Promise.resolve();
        }
    };

    // Handle Sponsors
    const drawSponsors = () => {
        if (sponsorsFile) {
            const imgSponsor = new Image();
            imgSponsor.src = sponsorsFile;

            return new Promise((resolve, reject) => {
                imgSponsor.onload = () => {
                    console.log("Sponsor image loaded with dimensions:", imgSponsor.width, imgSponsor.height);
                    // Create a canvas for extracting the alpha channel
                    const alphaCanvas = document.createElement('canvas');
                    const alphaCtx = alphaCanvas.getContext('2d');
                    alphaCanvas.width = imgSponsor.width;
                    alphaCanvas.height = imgSponsor.height;

                    // Draw the sponsor image to extract its alpha channel
                    alphaCtx.drawImage(imgSponsor, 0, 0);
                    const imageData = alphaCtx.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height);
                    const data = imageData.data;

                    // Create a new canvas to draw the color image with the alpha channel
                    const combinedCanvas = document.createElement('canvas');
                    const combinedCtx = combinedCanvas.getContext('2d');
                    combinedCanvas.width = imgSponsor.width;
                    combinedCanvas.height = imgSponsor.height;

                    // Draw the sponsor image onto the combined canvas
                    combinedCtx.drawImage(imgSponsor, 0, 0);

                    // Now, set the alpha channel
                    const combinedData = combinedCtx.getImageData(0, 0, combinedCanvas.width, combinedCanvas.height);
                    const combinedPixels = combinedData.data;

                    // Apply the alpha values from the original image
                    for (let i = 0; i < combinedPixels.length; i += 4) {
                        combinedPixels[i + 3] = data[i + 3]; // Set the alpha channel
                    }

                    combinedCtx.putImageData(combinedData, 0, 0);

                    // Create a texture from the combined canvas
                    const sponsorTexture = new THREE.Texture(combinedCanvas);
                    sponsorTexture.flipY = false; // Ensure flipY is false
                    sponsorTexture.colorSpace = THREE.SRGBColorSpace; // Set color space
                    sponsorTexture.needsUpdate = true;

                    model.traverse((node) => {
                        if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                            const sponsorMaterial = new THREE.MeshPhysicalMaterial({
                                map: sponsorTexture,
                                clearcoat: sponsorsMats.clearCoat,
                                clearcoatRoughness: sponsorsMats.clearCoatRoughness,
                                metalness: sponsorsMats.metallic,
                                roughness: sponsorsMats.baseRoughness,
                                transparent: true,
                                opacity: 1,
                                envMap: envMap,
                                depthWrite: false, // Disable depth writing for sponsors
                                depthTest: true, // Enable depth testing for sponsors
                            });

                            sponsorMesh = new THREE.Mesh(node.geometry, sponsorMaterial);
                            sponsorMesh.position.copy(node.position);
                            sponsorMesh.rotation.copy(node.rotation);
                            sponsorMesh.scale.copy(node.scale);
                            sponsorMesh.scale.x += 0.0001
                            sponsorMesh.scale.y += 0.0001
                            sponsorMesh.scale.z += 0.0001
                            sponsorMesh.material.name = "SponsorMaterial"; // Set a name for identification

                            console.log("Adding sponsor mesh at position:", sponsorMesh.position);
                            scene.add(sponsorMesh);
                        }
                    });
                    resolve(); // Resolve when sponsors are drawn
                };

                imgSponsor.onerror = () => {
                    console.error("Failed to load sponsor image");
                    reject("Failed to load sponsor image");
                };
            });
        } else {
            console.log("Sponsors missing, using just the decals.");
            return Promise.resolve();
        }
    };

    // Clean up previous meshes before drawing new ones
    cleanupPreviousMeshes();

    // Execute decal and sponsor drawing in sequence
    drawDecals().then(() => {
        return drawSponsors();
    }).catch(err => {
        console.error(err);
    });
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
					console.log(jsonContent)
					if (file.name === "decals.json") {
						decalsMats = jsonContent
					} else if (file.name === "sponsors.json") {
						sponsorsMats = jsonContent
					}
				}
            };
            reader.readAsDataURL(file);
        }
    }
	setTimeout(() => {
		console.log("triggering decals")
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

function loadImageAsync(img) {
	return new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = () => reject(`Could not load image: ${img.src}`);
	});
}


// Initialize
init();