import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, model, envMap;
let textureCanvas, context, texture;
let isDrawing = false;
let dragAndDropTexture = null;


const modelFiles = [
    'ginetta_g55_gt4_exterior.gltf',
    'model1.gltf',
    'model2.gltf',
    // Add more models as needed
];


function init() {
    // Create the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('modelContainer').appendChild(renderer.domElement);

    const cubeMapLoader = new THREE.CubeTextureLoader();
    envMap = cubeMapLoader.load([
        'cubemap/negx.jpg',
        'cubemap/posx.jpg',
        'cubemap/negy.jpg',
        'cubemap/posy.jpg',
        'cubemap/negz.jpg',
        'cubemap/posz.jpg'
    ]);
    envMap.encoding = THREE.sRGBEncoding;

    // Populate the dropdown with available models
    const modelSelector = document.getElementById('modelSelector');
    modelFiles.forEach((file) => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        modelSelector.appendChild(option);
    });

    // Load the initial model
    loadModel(modelFiles[0]); // Load the first model initially

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(directionalLight);

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

    // Animation loop
    animate();
}

function loadModel(modelPath) {
    // Remove the existing model if it exists
    if (model) {
        scene.remove(model);
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
    loader.load(`models/${modelPath}`, (gltf) => {
        model = gltf.scene;
        scene.add(model);
        loadStaticImage('image.png').then((texture) => {
            // Set texture properties
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = false;

            model.traverse((node) => {
                if (node.isMesh && node.material.name === "EXT_Carpaint_Inst") {
                    const decalMaterial = new THREE.MeshPhysicalMaterial({
                        name: node.material.name,
                        color: 0xffffff,
                        clearcoat: 1,
                        clearcoatRoughness: 0.01,
                        metalness: 0.9,
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
                                depthWrite: false, // Disable depth writing for sponsors
                                depthTest: true, // Enable depth testing for sponsors
                            });

                            const sponsorMesh = new THREE.Mesh(node.geometry, sponsorMaterial);
                            sponsorMesh.position.copy(node.position);
                            sponsorMesh.rotation.copy(node.rotation);
                            sponsorMesh.scale.copy(node.scale);
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

// Animation loop
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