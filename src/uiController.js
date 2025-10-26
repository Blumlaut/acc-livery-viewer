export class UIController {
    constructor(state, modelLoader, materialManager, environmentManager, liveryEditor) {
        this.state = state;
        this.modelLoader = modelLoader;
        this.materialManager = materialManager;
        this.environmentManager = environmentManager;
        this.liveryEditor = liveryEditor;
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
        this.ensureBrushSettings();
        this.populateSelectors();
        this.loadSettingsFromCookies();
        await this.applyUrlParameters();
        this.syncEditorPanelControls();
        this.renderLayerList();
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
        this.editorPanel = document.getElementById('editorPanel');
        this.editorPanelToggle = document.getElementById('editorPanelToggle');
        this.editorPanelClose = document.getElementById('editorPanelClose');
        this.layerList = document.getElementById('layerList');
        this.createLayerButton = document.getElementById('createLayerButton');
        this.mergeLayerButton = document.getElementById('mergeLayerButton');
        this.toolSelect = document.getElementById('toolSelect');
        this.brushSizeRange = document.getElementById('brushSizeRange');
        this.brushOpacityRange = document.getElementById('brushOpacityRange');
        this.brushHardnessRange = document.getElementById('brushHardnessRange');
        this.mirrorToggleInput = document.getElementById('mirrorToggle');
        this.mirrorAxisSelect = document.getElementById('mirrorAxisSelect');
        this.mirrorModeSelect = document.getElementById('mirrorModeSelect');
        this.stickerUploadInput = document.getElementById('stickerUploadInput');
        this.textEntryForm = document.getElementById('textEntryForm');
        this.textEntryInput = document.getElementById('textEntryInput');
        this.exportLiveryButton = document.getElementById('exportLiveryButton');
        this.uvBackgroundToggle = document.getElementById('uvBackgroundToggle');
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

        this.registerEditorPanelEvents();
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

    registerEditorPanelEvents() {
        if (this.editorPanelToggle && this.editorPanel) {
            this.editorPanelToggle.addEventListener('click', () => {
                const isOpen = !this.editorPanel.classList.contains('open');
                this.setEditorPanelOpen(isOpen);
            });
        }

        if (this.editorPanelClose && this.editorPanel) {
            this.editorPanelClose.addEventListener('click', () => this.setEditorPanelOpen(false));
        }

        if (this.layerList) {
            this.layerList.addEventListener('click', (event) => {
                const item = event.target.closest('[data-layer-id]');
                if (!item || !this.layerList.contains(item) || item.classList.contains('locked')) {
                    return;
                }
                this.handleLayerSelection(item.dataset.layerId);
            });
        }

        if (this.createLayerButton) {
            this.createLayerButton.addEventListener('click', () => {
                const snapshot = this.state.captureEditorState();
                const layerIndex = this.state.layers.length + 1;
                const newLayer = this.state.insertLayer({
                    name: `Layer ${layerIndex}`,
                    type: 'paint',
                    metadata: { items: [] }
                });
                if (newLayer) {
                    if (this.liveryEditor) {
                        this.liveryEditor.ensureLayerSurface(newLayer);
                        this.liveryEditor.setActiveLayer(newLayer.id);
                    }
                    this.state.recordUndoState(snapshot);
                    this.state.setActiveLayer(newLayer.id);
                    this.renderLayerList();
                }
            });
        }

        if (this.mergeLayerButton) {
            this.mergeLayerButton.addEventListener('click', () => this.mergeActiveLayerDown());
        }

        if (this.toolSelect) {
            this.toolSelect.addEventListener('change', (event) => {
                this.state.setActiveTool(event.target.value);
                if (this.liveryEditor) {
                    this.liveryEditor.setActiveTool(event.target.value);
                }
            });
        }

        if (this.brushSizeRange) {
            this.brushSizeRange.addEventListener('input', (event) => {
                this.updateBrushSetting('size', Number(event.target.value));
            });
        }

        if (this.brushOpacityRange) {
            this.brushOpacityRange.addEventListener('input', (event) => {
                this.updateBrushSetting('opacity', Number(event.target.value));
            });
        }

        if (this.brushHardnessRange) {
            this.brushHardnessRange.addEventListener('input', (event) => {
                this.updateBrushSetting('hardness', Number(event.target.value));
            });
        }

        if (this.mirrorToggleInput) {
            this.mirrorToggleInput.addEventListener('change', (event) => {
                this.state.setSymmetrySettings({ enabled: event.target.checked });
                if (this.liveryEditor) {
                    this.liveryEditor.setMirrorSettings({ ...this.state.symmetrySettings });
                }
            });
        }

        if (this.mirrorAxisSelect) {
            this.mirrorAxisSelect.addEventListener('change', (event) => {
                this.state.setSymmetrySettings({ axis: event.target.value });
                if (this.liveryEditor) {
                    this.liveryEditor.setMirrorSettings({ ...this.state.symmetrySettings, axis: event.target.value });
                }
            });
        }

        if (this.mirrorModeSelect) {
            this.mirrorModeSelect.addEventListener('change', (event) => {
                this.state.setSymmetrySettings({ mode: event.target.value });
                if (this.liveryEditor) {
                    this.liveryEditor.setMirrorSettings({ ...this.state.symmetrySettings, mode: event.target.value });
                }
            });
        }

        if (this.uvBackgroundToggle) {
            this.uvBackgroundToggle.addEventListener('change', (event) => {
                if (this.liveryEditor) {
                    this.liveryEditor.setTemplateVisibility(event.target.checked);
                }
            });
        }

        if (this.stickerUploadInput) {
            this.stickerUploadInput.addEventListener('change', (event) => {
                if (event.target.files?.length) {
                    this.handleStickerUpload(event.target.files[0]);
                }
                event.target.value = '';
            });
        }

        if (this.textEntryForm) {
            this.textEntryForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const textValue = (this.textEntryInput?.value || '').trim();
                if (!textValue) {
                    return;
                }
                const snapshot = this.state.captureEditorState();
                const newLayer = this.state.insertLayer({
                    name: textValue,
                    type: 'text',
                    metadata: { items: [] }
                });
                if (newLayer) {
                    if (this.liveryEditor) {
                        this.liveryEditor.setActiveLayer(newLayer.id);
                        this.liveryEditor.addTextToLayer(newLayer.id, textValue);
                    }
                    this.state.setActiveLayer(newLayer.id);
                    this.state.recordUndoState(snapshot);
                    this.renderLayerList();
                }
                if (this.textEntryInput) {
                    this.textEntryInput.value = '';
                }
            });
        }

        if (this.exportLiveryButton) {
            this.exportLiveryButton.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('editor:exportLivery'));
            });
        }
    }

    setEditorPanelOpen(isOpen) {
        if (!this.editorPanel) {
            return;
        }
        this.editorPanel.classList.toggle('open', Boolean(isOpen));
        this.editorPanel.setAttribute('aria-hidden', (!isOpen).toString());
        if (this.editorPanelToggle) {
            this.editorPanelToggle.setAttribute('aria-expanded', Boolean(isOpen).toString());
        }
    }

    ensureBrushSettings() {
        if (!this.state.brushSettings) {
            this.state.brushSettings = {
                size: this.brushSizeRange ? Number(this.brushSizeRange.value) : 50,
                opacity: this.brushOpacityRange ? Number(this.brushOpacityRange.value) : 1,
                hardness: this.brushHardnessRange ? Number(this.brushHardnessRange.value) : 0.8,
                color: '#ffffff',
            };
        } else {
            this.state.brushSettings = {
                size: this.state.brushSettings.size ?? (this.brushSizeRange ? Number(this.brushSizeRange.value) : 50),
                opacity: this.state.brushSettings.opacity ?? (this.brushOpacityRange ? Number(this.brushOpacityRange.value) : 1),
                hardness: this.state.brushSettings.hardness ?? (this.brushHardnessRange ? Number(this.brushHardnessRange.value) : 0.8),
                color: this.state.brushSettings.color || '#ffffff',
            };
        }

        if (this.liveryEditor) {
            Object.entries(this.state.brushSettings).forEach(([key, value]) => {
                this.liveryEditor.updateBrushSetting(key, value);
            });
        }
    }

    syncEditorPanelControls() {
        if (this.toolSelect) {
            if (this.state.activeTool) {
                this.toolSelect.value = this.state.activeTool;
            } else {
                this.state.setActiveTool(this.toolSelect.value);
            }
            if (this.liveryEditor) {
                this.liveryEditor.setActiveTool(this.state.activeTool || this.toolSelect.value);
            }
        }

        const symmetry = this.state.symmetrySettings || {};
        if (this.mirrorToggleInput) {
            this.mirrorToggleInput.checked = Boolean(symmetry.enabled);
        }
        if (this.mirrorAxisSelect && symmetry.axis) {
            this.mirrorAxisSelect.value = symmetry.axis;
        }
        if (this.mirrorModeSelect && symmetry.mode) {
            this.mirrorModeSelect.value = symmetry.mode;
        }
        if (this.liveryEditor) {
            this.liveryEditor.setMirrorSettings(symmetry);
        }

        if (this.state.brushSettings) {
            if (this.brushSizeRange && typeof this.state.brushSettings.size === 'number') {
                this.brushSizeRange.value = String(this.state.brushSettings.size);
            }
            if (this.brushOpacityRange && typeof this.state.brushSettings.opacity === 'number') {
                this.brushOpacityRange.value = String(this.state.brushSettings.opacity);
            }
            if (this.brushHardnessRange && typeof this.state.brushSettings.hardness === 'number') {
                this.brushHardnessRange.value = String(this.state.brushSettings.hardness);
            }
        }

        if (this.uvBackgroundToggle && this.liveryEditor) {
            this.uvBackgroundToggle.checked = this.liveryEditor.isTemplateVisible();
        }
    }

    renderLayerList() {
        if (!this.layerList) {
            return;
        }

        this.layerList.innerHTML = '';
        const layers = Array.isArray(this.state.layers) ? [...this.state.layers] : [];
        if (!layers.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'layer-item layer-item-empty';
            emptyItem.textContent = 'No layers yet';
            this.layerList.appendChild(emptyItem);
            return;
        }

        const orderedLayers = layers.slice().reverse();
        orderedLayers.forEach((layer) => {
            const listItem = document.createElement('li');
            listItem.className = 'layer-item';
            listItem.dataset.layerId = layer.id;

            const isBaseLayer = Boolean(
                this.state.baseLayers && (
                    this.state.baseLayers.decals === layer.id ||
                    this.state.baseLayers.sponsors === layer.id
                )
            );
            const isLocked = isBaseLayer || layer.locked;
            if (isLocked) {
                listItem.classList.add('locked');
            }
            if (this.state.activeLayerId === layer.id) {
                listItem.classList.add('active');
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = layer.name || layer.id;
            listItem.appendChild(nameSpan);

            const meta = document.createElement('span');
            meta.className = 'layer-meta';
            if (layer.type) {
                const typeSpan = document.createElement('span');
                typeSpan.className = 'layer-type';
                typeSpan.textContent = layer.type;
                meta.appendChild(typeSpan);
            }
            if (isLocked) {
                const lockSpan = document.createElement('span');
                lockSpan.className = 'layer-item-lock';
                lockSpan.setAttribute('aria-label', 'Locked layer');
                lockSpan.textContent = '🔒';
                meta.appendChild(lockSpan);
            }
            if (meta.childNodes.length) {
                listItem.appendChild(meta);
            }

            this.layerList.appendChild(listItem);
        });
    }

    handleLayerSelection(layerId) {
        if (!layerId) {
            return;
        }
        this.state.setActiveLayer(layerId);
        if (this.liveryEditor) {
            this.liveryEditor.setActiveLayer(layerId);
        }
        this.renderLayerList();
    }

    mergeActiveLayerDown() {
        const activeLayerId = this.state.activeLayerId;
        if (!activeLayerId) {
            console.warn('No active layer selected to merge.');
            return;
        }

        const layers = Array.isArray(this.state.layers) ? this.state.layers : [];
        const activeIndex = layers.findIndex((layer) => layer.id === activeLayerId);
        if (activeIndex <= 0) {
            console.warn('No available layer below to merge with.');
            return;
        }

        const targetLayer = layers[activeIndex - 1];
        const snapshot = this.state.captureEditorState();
        const merged = this.state.mergeLayers(targetLayer.id, activeLayerId, () => {
            if (this.liveryEditor) {
                this.liveryEditor.mergeLayers(targetLayer.id, activeLayerId);
            }
        });
        if (merged) {
            this.state.recordUndoState(snapshot);
            this.state.setActiveLayer(targetLayer.id);
            if (this.liveryEditor) {
                this.liveryEditor.setActiveLayer(targetLayer.id);
            }
            this.renderLayerList();
        }
    }

    updateBrushSetting(key, value) {
        if (!this.state.brushSettings) {
            this.state.brushSettings = {};
        }
        this.state.brushSettings = {
            ...this.state.brushSettings,
            [key]: value,
        };
        if (this.liveryEditor) {
            this.liveryEditor.updateBrushSetting(key, value);
        }
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

    handleStickerUpload(file) {
        if (!file || !this.liveryEditor) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result;
            if (typeof dataUrl !== 'string') {
                return;
            }

            const snapshot = this.state.captureEditorState();
            let targetLayerId = this.state.activeLayerId;

            if (!targetLayerId) {
                const newLayer = this.state.insertLayer({
                    name: file.name.replace(/\.[^/.]+$/, '') || `Sticker ${this.state.layers.length + 1}`,
                    type: 'sticker',
                    metadata: { items: [] }
                });
                if (newLayer) {
                    targetLayerId = newLayer.id;
                    this.state.setActiveLayer(targetLayerId);
                    this.renderLayerList();
                }
            }

            if (!targetLayerId) {
                return;
            }

            const sticker = await this.liveryEditor.addStickerToLayer(targetLayerId, dataUrl, { name: file.name });
            if (!sticker) {
                return;
            }
            this.liveryEditor.setActiveLayer(targetLayerId);
            this.state.setActiveLayer(targetLayerId);
            this.state.recordUndoState(snapshot);
            this.renderLayerList();
        };
        reader.readAsDataURL(file);
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
        } else {
            console.log('Unrecognized JSON file content.', content);
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
