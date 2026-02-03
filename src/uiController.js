export class UIController {
    constructor(state, modelLoader, materialManager, environmentManager) {
        this.state = state;
        this.modelLoader = modelLoader;
        this.materialManager = materialManager;
        this.environmentManager = environmentManager;
        this.fileActions = {
            'decals.png': (file) => {
                // Cleanup previous decals URL if exists
                if (this.state.decalsFile) {
                    URL.revokeObjectURL(this.state.decalsFile);
                }
                this.materialManager.setDecalsFile(URL.createObjectURL(file));
            },
            'sponsors.png': (file) => {
                // Cleanup previous sponsors URL if exists
                if (this.state.sponsorsFile) {
                    URL.revokeObjectURL(this.state.sponsorsFile);
                }
                this.materialManager.setSponsorsFile(URL.createObjectURL(file));
            },
            'decals.json': (content) => {
                paintMaterials.customDecal = content;
            },
            'sponsors.json': (content) => {
                paintMaterials.customSponsor = content;
            },
            'car.json': (content) => {
                const { bodyColours, bodyMaterials } = this.materialManager.applyCarJsonData(content);
                this.updateColourPickers(bodyColours);
                this.updateMaterialSelectors(bodyMaterials);
            },
        };
    }

    async initialize() {
        this.cacheDomElements();
        this.populateSelectors();
        this.loadSettingsFromCookies();
        await this.applyUrlParameters();
        this.registerEventListeners();
        this.registerDragAndDrop();
    }

    cacheDomElements() {
        this.modelSelector = document.getElementById('modelSelector');
        this.liverySelector = document.getElementById('liverySelector');
        this.cubemapSelector = document.getElementById('cubemapSelector');
        this.lodSelector = document.getElementById('lodSelector');
        this.skyboxToggle = document.getElementById('skybox-toggle');
        this.postProcessingToggle = document.getElementById('post-processing-toggle');
        this.layerColourPickers = [
            document.getElementById('layer1Color'),
            document.getElementById('layer2Color'),
            document.getElementById('layer3Color'),
            document.getElementById('rimColor'),
        ];
        this.layerMaterialSelectors = [
            document.getElementById('layer1Material'),
            document.getElementById('layer2Material'),
            document.getElementById('layer3Material'),
            document.getElementById('rimMaterial'),
        ];
        this.unloadLiveryButton = document.getElementById('unloadCustomLivery');
        this.fileInput = document.getElementById('fileInput');
        this.multiFileUpload = document.getElementById('multiFileUpload');
    }

    setModelSelection(value) {
        if (this.modelSelector) {
            this.modelSelector.value = value;
        }
    }

    setLiverySelection(value) {
        if (this.liverySelector) {
            this.liverySelector.value = value;
        }
    }

    populateSelectors() {
        Object.entries(modelFiles).forEach(([folder]) => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            this.modelSelector.appendChild(option);
        });

        cubemaps.forEach((folder) => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            this.cubemapSelector.appendChild(option);
        });
    }

    populateLiverySelector(modelPath) {
        if (!modelPath) {
            return;
        }
        while (this.liverySelector.firstChild) {
            this.liverySelector.removeChild(this.liverySelector.firstChild);
        }
        const liveries = baseLiveries[modelPath];
        if (!liveries) {
            return;
        }
        Object.entries(liveries).forEach(([id, data]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = data.name;
            this.liverySelector.appendChild(option);
        });
    }

    loadSettingsFromCookies() {
        if (getCookie('skybox')) {
            const skybox = getCookie('skybox');
            this.state.setSkybox(skybox);
            this.cubemapSelector.value = skybox;
        }
        if (getCookie('skyboxActive')) {
            const enabled = getCookie('skyboxActive') === 'true';
            this.state.setSkyboxEnabled(enabled);
            this.skyboxToggle.checked = enabled;
        }
        if (getCookie('postProcessing')) {
            const enabled = getCookie('postProcessing') === 'true';
            this.togglePostProcessing(enabled);
        }
        if (getCookie('model')) {
            const modelPath = getCookie('model');
            this.state.firstRun = false;
            this.state.setCurrentModelPath(modelPath);
            this.modelSelector.value = modelPath;
            this.populateLiverySelector(modelPath);
        }
        if (getCookie('currentLivery')) {
            const livery = getCookie('currentLivery');
            this.state.setCurrentLivery(livery);
            this.liverySelector.value = livery;
        }
        if (getCookie('lodLevel')) {
            const lod = getCookie('lodLevel');
            this.state.setLodLevel(lod);
            this.lodSelector.value = lod;
        }

        this.layerMaterialSelectors.slice(0, 3).forEach((selector, index) => {
            const cookie = getCookie(`materialPreset_baseLivery${index + 1}`);
            if (cookie) {
                this.state.bodyMaterials[index] = cookie;
                selector.value = cookie;
                this.materialManager.applyMaterialPreset(`baseLivery${index + 1}`, paintMaterials[cookie]);
            }
        });

        const rimMaterialCookie = getCookie('rimMaterial');
        if (rimMaterialCookie) {
            this.state.bodyMaterials[3] = rimMaterialCookie;
            this.layerMaterialSelectors[3].value = rimMaterialCookie;
            this.materialManager.applyMaterialPreset('EXT_RIM', paintMaterials[rimMaterialCookie]);
        }

        this.layerColourPickers.slice(0, 3).forEach((picker, index) => {
            const cookie = getCookie(`materialColor_baseLivery${index + 1}`);
            if (cookie) {
                const hex = coloridToHex(cookie);
                this.state.bodyColours[index] = hex;
                picker.setValue(hex);
            }
        });

        const rimColourCookie = getCookie('rimColour');
        if (rimColourCookie) {
            const hex = coloridToHex(rimColourCookie);
            this.state.bodyColours[3] = hex;
            this.layerColourPickers[3].setValue(hex);
            this.materialManager.changeMaterialColor('EXT_RIM', hex);
            this.materialManager.applyMaterialPreset('EXT_RIM', paintMaterials[this.state.bodyMaterials[3]]);
        }
    }

    async applyUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasQueryParams = Array.from(urlParams.keys()).length > 0;
        if (hasQueryParams) {
            ['settingsLayer', 'liveryLayer', 'overlay'].forEach((id) => {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'none';
                }
            });
        }

        if (urlParams.has('carId')) {
            const carInfo = cars[urlParams.get('carId')];
            if (carInfo?.modelKey) {
                this.state.setCurrentModelPath(carInfo.modelKey);
                this.modelSelector.value = carInfo.modelKey;
                this.populateLiverySelector(carInfo.modelKey);
            }
        } else if (urlParams.has('model')) {
            const modelPath = urlParams.get('model');
            this.state.setCurrentModelPath(modelPath);
            this.modelSelector.value = modelPath;
            this.populateLiverySelector(modelPath);
        }

        if (urlParams.has('livery')) {
            const livery = urlParams.get('livery');
            this.state.setCurrentLivery(livery);
            this.liverySelector.value = livery;
        }

        if (urlParams.has('carJson')) {
            try {
                const response = await fetch(urlParams.get('carJson'));
                const data = await response.json();
                const { bodyColours, bodyMaterials } = this.materialManager.applyCarJsonData(data);
                this.updateColourPickers(bodyColours);
                this.updateMaterialSelectors(bodyMaterials);
            } catch (error) {
                console.error('Failed to load carJson', error);
            }
        }

        if (urlParams.has('decalsJson')) {
            try {
                const base64Data = urlParams.get('decalsJson');
                const content = JSON.parse(atob(base64Data));
                this.fileActions['decals.json'](content);
            } catch (error) {
                console.error('Failed to load decalsJson from URL', error);
            }
        }

        if (urlParams.has('sponsorsJson')) {
            try {
                const base64Data = urlParams.get('sponsorsJson');
                const content = JSON.parse(atob(base64Data));
                this.fileActions['sponsors.json'](content);
            } catch (error) {
                console.error('Failed to load sponsorsJson from URL', error);
            }
        }

        if (urlParams.has('decalsImage')) {
            try {
                const base64Data = urlParams.get('decalsImage');
                const content = atob(base64Data);
                const blob = new Blob([content], { type: 'image/png' });
                const file = new File([blob], 'decals.png', { type: 'image/png' });
                this.fileActions['decals.png'](file);
            } catch (error) {
                console.error('Failed to load decalsImage from URL', error);
            }
        }

        if (urlParams.has('sponsorsImage')) {
            try {
                const base64Data = urlParams.get('sponsorsImage');
                const content = atob(base64Data);
                const blob = new Blob([content], { type: 'image/png' });
                const file = new File([blob], 'sponsors.png', { type: 'image/png' });
                this.fileActions['sponsors.png'](file);
            } catch (error) {
                console.error('Failed to load sponsorsImage from URL', error);
            }
        }

        if (urlParams.has('liveryFiles')) {
            try {
                await this.loadLiveryFilesFromUrl(urlParams.get('liveryFiles'));
            } catch (error) {
                console.error('Failed to load livery files from URL', error);
            }
        }
    }

    async loadLiveryFromAttrition(liveryId, attritionUrl) {
        console.log('[loadLiveryFromAttrition] Starting with liveryId:', liveryId, 'attritionUrl:', attritionUrl);
        try {
            const url = `${attritionUrl}/liveries/${liveryId}/preview-viewer`;
            console.log('[loadLiveryFromAttrition] Fetching URL:', url);
            const response = await fetch(url);
            console.log('[loadLiveryFromAttrition] Response received, status:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch livery: ${response.status}`);
            }
            const data = await response.json();
            console.log('[loadLiveryFromAttrition] Response data:', data);
            console.log('[loadLiveryFromAttrition] Has encodedFiles:', !!data.encodedFiles);
            console.log('[loadLiveryFromAttrition] encodedFiles type:', typeof data.encodedFiles);
            console.log('[loadLiveryFromAttrition] encodedFiles length:', data.encodedFiles?.length);
            if (!data.encodedFiles) {
                throw new Error('No livery data available');
            }
            console.log('[loadLiveryFromAttrition] Calling loadLiveryFilesFromUrl with:', data.encodedFiles.substring(0, 100) + '...');
            await this.loadLiveryFilesFromUrl(data.encodedFiles);
            console.log('[loadLiveryFromAttrition] Successfully loaded livery files');
        } catch (error) {
            console.error('[loadLiveryFromAttrition] Failed to load livery from attrition:', error);
            alert('Failed to load livery from attrition. Please try again later.');
        }
    }

    async loadLiveryFilesFromUrl(encodedFiles) {
        console.log('[loadLiveryFilesFromUrl] Starting with encodedFiles length:', encodedFiles?.length);
        if (!encodedFiles) {
            console.error('[loadLiveryFilesFromUrl] No encoded files parameter provided');
            return;
        }

        try {
            console.log('[loadLiveryFilesFromUrl] Decoding JSON from base64');
            const decodedJson = this.base64Decode(encodedFiles);
            console.log('[loadLiveryFilesFromUrl] Decoded JSON length:', decodedJson.length);
            console.log('[loadLiveryFilesFromUrl] Parsed JSON structure:', typeof decodedJson);
            const files = JSON.parse(decodedJson);
            console.log('[loadLiveryFilesFromUrl] Files object keys:', Object.keys(files));
            console.log('[loadLiveryFilesFromUrl] Number of files to process:', Object.keys(files).length);

            const filePromises = [];

            Object.entries(files).forEach(([filename, base64Content], index) => {
                console.log(`[loadLiveryFilesFromUrl] Processing file ${index + 1}/${Object.keys(files).length}:`, filename);
                console.log(`[loadLiveryFilesFromUrl] File content length:`, base64Content?.length);
                console.log(`[loadLiveryFilesFromUrl] File content first 50 chars:`, base64Content?.substring(0, 50));
                
                const promise = new Promise((resolve) => {
                    try {
                        console.log(`[loadLiveryFilesFromUrl] Decoding ${filename} from base64`);
                        const content = this.base64Decode(base64Content);
                        console.log(`[loadLiveryFilesFromUrl] ${filename} decoded successfully, length:`, content.length);

                        if (filename.endsWith('.json')) {
                            try {
                                const jsonContent = JSON.parse(content);
                                console.log(`[loadLiveryFilesFromUrl] Parsed ${filename} JSON, keys:`, Object.keys(jsonContent));
                                if (this.fileActions[filename]) {
                                    this.fileActions[filename](jsonContent);
                                    console.log(`[loadLiveryFilesFromUrl] Applied ${filename} via fileActions`);
                                } else {
                                    console.log(`[loadLiveryFilesFromUrl] No fileActions handler for ${filename}`);
                                }
                            } catch (jsonError) {
                                console.error(`[loadLiveryFilesFromUrl] Failed to parse JSON file ${filename}`, jsonError);
                            }
                        } else if (filename.endsWith('.png')) {
                            console.log(`[loadLiveryFilesFromUrl] Creating blob for ${filename}`);
                            const blob = new Blob([content], { type: 'image/png' });
                            console.log(`[loadLiveryFilesFromUrl] Blob created, size:`, blob.size);
                            const file = new File([blob], filename, { type: 'image/png' });
                            console.log(`[loadLiveryFilesFromUrl] File created, name:`, file.name);
                            if (this.fileActions[filename]) {
                                this.fileActions[filename](file);
                                console.log(`[loadLiveryFilesFromUrl] Applied ${filename} via fileActions`);
                            } else {
                                console.log(`[loadLiveryFilesFromUrl] No fileActions handler for ${filename}`);
                            }
                        }

                        resolve();
                    } catch (error) {
                        console.error(`[loadLiveryFilesFromUrl] Failed to load file ${filename} from URL`, error);
                        resolve();
                    }
                });
                filePromises.push(promise);
            });

            console.log('[loadLiveryFilesFromUrl] Waiting for all file promises to resolve');
            await Promise.all(filePromises);
            console.log('[loadLiveryFilesFromUrl] All files processed successfully');

            setTimeout(async () => {
                try {
                    console.log('[loadLiveryFilesFromUrl] Merging and setting decals');
                    await this.materialManager.mergeAndSetDecals(this.state.currentLivery);
                    console.log('[loadLiveryFilesFromUrl] Decals merged successfully');
                } catch (error) {
                    console.error('[loadLiveryFilesFromUrl] Failed to merge decals after loading livery files', error);
                }
            }, 100);
        } catch (error) {
            console.error('[loadLiveryFilesFromUrl] Error in loadLiveryFilesFromUrl', error);
            console.error('[loadLiveryFilesFromUrl] Error details:', error.message);
            console.error('[loadLiveryFilesFromUrl] Error stack:', error.stack);
        }
    }

    base64Decode(str) {
        console.log('[base64Decode] Input length:', str?.length);
        console.log('[base64Decode] Input first 100 chars:', str?.substring(0, 100));
        console.log('[base64Decode] Input last 100 chars:', str?.substring(str.length - 100));
        console.log('[base64Decode] Input is valid base64:', /^[A-Za-z0-9+/]+=*$/.test(str));
        if (!str || str.trim() === '') {
            console.log('[base64Decode] Empty or whitespace input, returning empty string');
            return '';
        }
        try {
            console.log('[base64Decode] Attempting atob decode');
            const decoded = window.atob(str);
            console.log('[base64Decode] atob succeeded, length:', decoded.length);
            console.log('[base64Decode] Attempting decodeURIComponent');
            const result = decodeURIComponent(escape(decoded));
            console.log('[base64Decode] Full decode succeeded, length:', result.length);
            return result;
        } catch (e) {
            console.error('[base64Decode] Base64 decode error:', e);
            console.error('[base64Decode] Error details:', e.message);
            console.error('[base64Decode] Error stack:', e.stack);
            return '';
        }
    }

    registerEventListeners() {
        this.skyboxToggle.addEventListener('change', () => {
            this.environmentManager.toggleSkybox(this.skyboxToggle.checked);
        });

        this.cubemapSelector.addEventListener('change', (event) => {
            const folder = event.target.value;
            this.state.setSkybox(folder);
            this.environmentManager.applySkybox(folder);
        });

        this.modelSelector.addEventListener('change', async (event) => {
            const modelPath = event.target.value;
            this.state.setCurrentModelPath(modelPath);
            this.populateLiverySelector(modelPath);
            const defaultLivery = this.modelLoader.getDefaultLivery(modelPath);
            if (defaultLivery) {
                this.state.setCurrentLivery(defaultLivery);
                this.liverySelector.value = defaultLivery;
            }
            try {
                await this.modelLoader.loadModel(modelPath);
            } catch (error) {
                console.error('Failed to load model', error);
            }
        });

        this.liverySelector.addEventListener('change', async (event) => {
            const livery = event.target.value;
            this.state.setCurrentLivery(livery);
            try {
                await this.materialManager.mergeAndSetDecals(livery);
            } catch (error) {
                console.error('Failed to apply livery', error);
            }
        });

        this.lodSelector.addEventListener('change', async (event) => {
            const value = event.target.value;
            this.state.setLodLevel(value);
            setCookie('lodLevel', value);
            try {
                await this.modelLoader.loadModel(this.state.currentModelPath || Object.keys(modelFiles)[0]);
            } catch (error) {
                console.error('Failed to reload model for new LOD', error);
            }
        });

        this.unloadLiveryButton.addEventListener('click', async () => {
            // Cleanup object URLs before reset
            if (this.state.decalsFile) {
                URL.revokeObjectURL(this.state.decalsFile);
                this.state.setDecalsFile(null);
            }
            if (this.state.sponsorsFile) {
                URL.revokeObjectURL(this.state.sponsorsFile);
                this.state.setSponsorsFile(null);
            }
            
            this.materialManager.resetCustomLivery();
            try {
                await this.materialManager.mergeAndSetDecals(this.state.currentLivery);
            } catch (error) {
                console.error('Failed to reset custom livery', error);
            }
        });

        this.layerColourPickers.forEach((picker, index) => {
            picker.addEventListener('change', (event) => {
                const value = event.target.value;
                this.state.bodyColours[index] = value;
                this.materialManager.applyBodyColours();
            });
        });

        this.layerMaterialSelectors.forEach((selector, index) => {
            selector.addEventListener('change', (event) => {
                const value = event.target.value;
                this.state.bodyMaterials[index] = value;
                if (index === 3) {
                    setCookie('rimMaterial', value);
                } else {
                    setCookie(`materialPreset_baseLivery${index + 1}`, value);
                }
                this.materialManager.applyBodyColours();
            });
        });

        this.multiFileUpload.addEventListener('change', (event) => this.handleFileUpload(event));

        // Add post-processing toggle listener
        if (this.postProcessingToggle) {
            this.postProcessingToggle.addEventListener('change', (event) => {
                this.togglePostProcessing(event.target.checked);
            });
        }
    }

    registerDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
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
                this.handleFileUpload({ target: { files: [...event.dataTransfer.files] } });
            }
        });
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        files.forEach((file) => this.processFile(file));
        setTimeout(async () => {
            try {
                await this.materialManager.mergeAndSetDecals(this.state.currentLivery);
            } catch (error) {
                console.error('Failed to merge decals after upload', error);
            }
        }, 100);
    }

    processFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (isImageFile(event.target.result)) {
                this.handleImageFile(file, event.target.result);
            } else {
                this.handleJsonFile(file, event.target.result);
            }
        };
        reader.readAsDataURL(file);
    }

    handleImageFile(file, dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            if (this.fileActions[file.name]) {
                this.fileActions[file.name](file);
            }
        };
    }

    handleJsonFile(file, dataUrl) {
        const base64Data = dataUrl.split(',')[1];
        const content = JSON.parse(atob(base64Data));
        if (this.fileActions[file.name]) {
            this.fileActions[file.name](content);
        } else if (content.hasOwnProperty('raceNumber')) {
            const { bodyColours, bodyMaterials } = this.materialManager.applyCarJsonData(content);
            this.updateColourPickers(bodyColours);
            this.updateMaterialSelectors(bodyMaterials);
        }
    }

    updateColourPickers(colours) {
        colours.forEach((colour, index) => {
            if (this.layerColourPickers[index]) {
                this.layerColourPickers[index].setValue(colour);
            }
        });
    }

    updateMaterialSelectors(materials) {
        materials.forEach((material, index) => {
            if (this.layerMaterialSelectors[index]) {
                this.layerMaterialSelectors[index].value = material;
            }
        });
    }

    togglePostProcessing(enabled) {
        // Store the setting in cookies
        setCookie('postProcessing', enabled);
        
        // Update post-processing effects
        if (this.state.composer && this.state.smaaPass) {
            this.state.smaaPass.enabled = enabled;
            this.state.gtaoPass.enabled = enabled
        }
        
        // Update UI to reflect current state
        if (this.postProcessingToggle) {
            this.postProcessingToggle.checked = enabled;
        }
    }
    
    // Method to get current post processing mode
    getPostProcessingMode() {
        return this.postProcessingToggle ? this.postProcessingToggle.checked : false;
    }
}
