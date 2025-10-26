const DEFAULT_CANVAS_SIZE = 2048;
const MIRROR_AXIS = { x: 'x', y: 'y', z: 'z' };

export class LiveryEditor {
    constructor(state, materialManager) {
        this.state = state;
        this.materialManager = materialManager;

        this.canvas = null;
        this.ctx = null;
        this.layerSurfaces = new Map();
        this.compositeSurfaces = new Map();
        this.imageCache = new Map();
        this.measureContext = document.createElement('canvas').getContext('2d');

        this.brushSettings = {
            size: 50,
            opacity: 1,
            hardness: 0.8,
            color: '#ffffff',
        };
        this.activeTool = this.state.activeTool || 'brush';
        this.mirrorSettings = { ...this.state.symmetrySettings };
        this.pointerState = null;
        this.templateImage = null;
        this.pendingSnapshot = null;
        this.selection = null;
        this.selectionHandles = [];
        this.showTemplate = true;
        this.handleRadius = 9;
        this.rotationHandleOffset = 48;
        this.currentCursor = 'default';

        this._handleEditorEvent = this._handleEditorEvent.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onBaseTextureChange = this._onBaseTextureChange.bind(this);
        this._onBaseLayersReady = this._onBaseLayersReady.bind(this);
    }

    async initialize() {
        this.canvas = document.getElementById('hiddenCanvas');
        if (!this.canvas) {
            console.warn('LiveryEditor: hidden canvas element is missing.');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this._ensureCanvasSize(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE);
        this._setCanvasCursor('default');

        this.state.addEditorListener(this._handleEditorEvent);
        this.state.addCleanupCallback(() => this.reset());

        this._attachInputHandlers();
        document.addEventListener('editor:exportLivery', () => this.exportLivery());
        document.addEventListener('editor:baseTextureChanged', this._onBaseTextureChange);
        document.addEventListener('editor:baseLayersReady', this._onBaseLayersReady);

        this.ensureBaseLayers();
        this.state.layers.forEach((layer) => this.ensureLayerSurface(layer));
        await this._loadTemplateFromSelection();
        this.renderComposite();
    }

    reset() {
        this.layerSurfaces.forEach((surface) => {
            surface.canvas.width = 0;
            surface.canvas.height = 0;
        });
        this.layerSurfaces.clear();
        this.compositeSurfaces.forEach((surface) => {
            surface.canvas.width = 0;
            surface.canvas.height = 0;
        });
        this.compositeSurfaces.clear();
        this.pointerState = null;
        this.pendingSnapshot = null;
        this.templateImage = null;
        this.selection = null;
        this.selectionHandles = [];
        this._ensureCanvasSize(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE);
        this._setCanvasCursor('default');
        if (this.materialManager) {
            this.materialManager.updateEditorOverlay('decals', null);
            this.materialManager.updateEditorOverlay('sponsors', null);
        }
    }

    setActiveLayer(layerId) {
        this.pointerState = null;
        if (this.selection && this.selection.layerId !== layerId) {
            this._clearSelection();
        }
        if (layerId) {
            this.ensureLayerSurface(this.state.getLayerById(layerId));
        }
    }

    setActiveTool(tool) {
        this.activeTool = tool;
    }

    updateBrushSetting(key, value) {
        this.brushSettings = {
            ...this.brushSettings,
            [key]: value,
        };
    }

    setMirrorSettings(settings = {}) {
        this.mirrorSettings = {
            ...this.mirrorSettings,
            ...settings,
        };
    }

    setTemplateVisibility(visible) {
        const nextValue = Boolean(visible);
        if (this.showTemplate === nextValue) {
            return;
        }
        this.showTemplate = nextValue;
        this.renderComposite();
    }

    isTemplateVisible() {
        return Boolean(this.showTemplate);
    }

    ensureBaseLayers() {
        const decalsBaseId = this.state.baseLayers?.decals;
        const sponsorsBaseId = this.state.baseLayers?.sponsors;

        const hasDecalsBase = decalsBaseId && this.state.getLayerById(decalsBaseId);
        const hasSponsorsBase = sponsorsBaseId && this.state.getLayerById(sponsorsBaseId);

        if (!hasDecalsBase) {
            this.state.insertLayer({
                name: 'Decals Base',
                type: 'base',
                locked: true,
                isBase: true,
                baseType: 'decals',
                metadata: { items: [] },
            }, 0);
        }

        if (!hasSponsorsBase) {
            const targetIndex = this.state.layers.length > 0 ? 1 : 0;
            this.state.insertLayer({
                name: 'Sponsors Base',
                type: 'base',
                locked: true,
                isBase: true,
                baseType: 'sponsors',
                metadata: { items: [] },
            }, targetIndex);
        }
    }

    ensureLayerSurface(layer) {
        if (!layer) {
            return null;
        }

        if (!layer.metadata || typeof layer.metadata !== 'object') {
            layer.metadata = {};
        }
        if (!Array.isArray(layer.metadata.items)) {
            layer.metadata.items = [];
        }

        let surface = this.layerSurfaces.get(layer.id);
        if (!surface) {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            surface = {
                canvas,
                ctx: canvas.getContext('2d'),
                items: [],
            };
            this.layerSurfaces.set(layer.id, surface);
        } else if (surface.canvas.width !== this.canvas.width || surface.canvas.height !== this.canvas.height) {
            surface.canvas.width = this.canvas.width;
            surface.canvas.height = this.canvas.height;
        }

        this._hydrateLayer(layer);
        return surface;
    }

    _ensureCompositeSurface(type) {
        if (!type) {
            return null;
        }
        let surface = this.compositeSurfaces.get(type);
        if (!surface) {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas?.width || DEFAULT_CANVAS_SIZE;
            canvas.height = this.canvas?.height || DEFAULT_CANVAS_SIZE;
            surface = {
                canvas,
                ctx: canvas.getContext('2d')
            };
            this.compositeSurfaces.set(type, surface);
        } else if (this.canvas && (surface.canvas.width !== this.canvas.width || surface.canvas.height !== this.canvas.height)) {
            surface.canvas.width = this.canvas.width;
            surface.canvas.height = this.canvas.height;
        }
        return surface;
    }

    _getOverlayTargetsForLayer(layer) {
        if (!layer) {
            return ['decals'];
        }
        const metadataTarget = layer.metadata?.targetOverlay || layer.metadata?.overlay;
        const baseType = (layer.baseType || layer.type || metadataTarget || '').toLowerCase();

        if (metadataTarget === 'decals' || metadataTarget === 'sponsors') {
            return [metadataTarget];
        }

        if (baseType === 'sponsors' || baseType === 'sponsorsbase') {
            return ['sponsors'];
        }

        return ['decals'];
    }

    removeLayer(layerId) {
        if (this.selection?.layerId === layerId) {
            this._clearSelection(false);
        }
        if (this.layerSurfaces.has(layerId)) {
            this.layerSurfaces.delete(layerId);
        }
    }

    mergeLayers(targetLayerId, sourceLayerId) {
        const targetLayer = this.state.getLayerById(targetLayerId);
        const sourceLayer = this.state.getLayerById(sourceLayerId);
        if (!targetLayer || !sourceLayer) {
            return;
        }

        this.ensureLayerSurface(targetLayer);
        this.ensureLayerSurface(sourceLayer);

        if (!Array.isArray(targetLayer.metadata.items)) {
            targetLayer.metadata.items = [];
        }
        if (Array.isArray(sourceLayer.metadata.items) && sourceLayer.metadata.items.length) {
            sourceLayer.metadata.items.forEach((item) => {
                targetLayer.metadata.items.push(item);
            });
        }

        this.layerSurfaces.delete(sourceLayerId);
        this._hydrateLayer(targetLayer);
        this.renderLayer(targetLayerId);
        this.renderComposite();
    }

    async addStickerToLayer(layerId, src, options = {}) {
        if (!layerId || !src) {
            return null;
        }
        const layer = this.state.getLayerById(layerId);
        if (!layer) {
            return null;
        }
        const image = await this._loadImage(src).catch(() => null);
        if (!image) {
            return null;
        }

        const sticker = {
            id: this._generateItemId('sticker'),
            type: 'sticker',
            src,
            width: options.width || image.width,
            height: options.height || image.height,
            opacity: options.opacity ?? 1,
            transform: {
                x: options.x ?? this.canvas.width / 2,
                y: options.y ?? this.canvas.height / 2,
                scaleX: options.scale ?? 1,
                scaleY: options.scale ?? 1,
                rotation: options.rotation ?? 0,
            },
        };

        layer.metadata.items.push(sticker);
        const surface = this.ensureLayerSurface(layer);
        const runtime = this._createRuntimeItem(layer.id, sticker);
        surface.items.push(runtime);

        const mirrored = this._maybeCreateMirroredItem(layer, sticker);
        if (mirrored) {
            layer.metadata.items.push(mirrored);
            surface.items.push(this._createRuntimeItem(layer.id, mirrored));
        }

        this.renderLayer(layer.id);
        this.renderComposite();
        this.state.markLayerDirty(layer.id);
        return sticker;
    }

    addTextToLayer(layerId, text, options = {}) {
        if (!layerId || !text) {
            return null;
        }
        const layer = this.state.getLayerById(layerId);
        if (!layer) {
            return null;
        }

        const textItem = {
            id: this._generateItemId('text'),
            type: 'text',
            content: text,
            font: options.font || 'Arial',
            size: options.size || 72,
            color: options.color || '#ffffff',
            opacity: options.opacity ?? 1,
            align: options.align || 'center',
            baseline: options.baseline || 'middle',
            transform: {
                x: options.x ?? this.canvas.width / 2,
                y: options.y ?? this.canvas.height / 2,
                scaleX: options.scaleX ?? 1,
                scaleY: options.scaleY ?? 1,
                rotation: options.rotation ?? 0,
            },
        };

        layer.metadata.items.push(textItem);
        const surface = this.ensureLayerSurface(layer);
        surface.items.push(this._createRuntimeItem(layer.id, textItem));

        const mirrored = this._maybeCreateMirroredText(layer, textItem);
        if (mirrored) {
            layer.metadata.items.push(mirrored);
            surface.items.push(this._createRuntimeItem(layer.id, mirrored));
        }

        this.renderLayer(layer.id);
        this.renderComposite();
        this.state.markLayerDirty(layer.id);
        return textItem;
    }

    renderLayer(layerId, options = {}) {
        const surface = this.layerSurfaces.get(layerId);
        if (!surface) {
            return;
        }
        const ctx = surface.ctx;
        ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
        surface.items.forEach((item) => {
            this._renderItem(ctx, item);
        });

        if (options.previewStroke) {
            this._renderStroke(ctx, options.previewStroke);
        }
        if (options.previewMirrors) {
            options.previewMirrors.forEach((mirror) => this._renderStroke(ctx, mirror));
        }
    }

    renderComposite() {
        if (!this.canvas || !this.ctx) {
            return;
        }
        this._renderBaseComposite(this.ctx, { includeTemplate: this.showTemplate });
        const overlayOutputs = this._renderOverlayComposites();
        this._drawSelectionOverlay(this.ctx);
        const appliedToViewer = this._syncCompositeWithViewer(overlayOutputs);
        this.state.markLayerDirty();
        document.dispatchEvent(new CustomEvent('editor:canvasUpdated', {
            detail: {
                origin: 'liveryEditor',
                applied: appliedToViewer,
                canvas: this.canvas,
                overlays: Object.fromEntries(
                    Object.entries(overlayOutputs)
                        .filter(([, surface]) => Boolean(surface))
                        .map(([type, surface]) => [type, surface.canvas])
                )
            }
        }));
    }

    _renderBaseComposite(ctx, options = {}) {
        if (!ctx || !this.canvas) {
            return;
        }
        const { includeTemplate = true } = options;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (includeTemplate && this.templateImage) {
            ctx.drawImage(this.templateImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this._drawFallbackBackground(ctx);
        }

        const layers = Array.isArray(this.state.layers) ? this.state.layers : [];
        layers.forEach((layer) => {
            if (layer.visible === false) {
                return;
            }
            const surface = this.layerSurfaces.get(layer.id);
            if (surface) {
                ctx.drawImage(surface.canvas, 0, 0);
            }
        });
    }

    _renderOverlayComposites() {
        const outputs = {
            decals: this._ensureCompositeSurface('decals'),
            sponsors: this._ensureCompositeSurface('sponsors')
        };

        Object.values(outputs).forEach((surface) => {
            if (surface && surface.canvas) {
                surface.ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
            }
        });

        const layers = Array.isArray(this.state.layers) ? this.state.layers : [];
        layers.forEach((layer) => {
            if (layer?.visible === false) {
                return;
            }
            const surface = this.layerSurfaces.get(layer.id);
            if (!surface) {
                return;
            }
            const targets = this._getOverlayTargetsForLayer(layer);
            targets.forEach((target) => {
                const compositeSurface = outputs[target];
                if (compositeSurface) {
                    compositeSurface.ctx.drawImage(surface.canvas, 0, 0);
                }
            });
        });

        return outputs;
    }

    _syncCompositeWithViewer(outputs) {
        if (!this.materialManager || !outputs) {
            return false;
        }
        let applied = false;
        Object.entries(outputs).forEach(([type, surface]) => {
            const canvas = surface?.canvas && surface.canvas.width && surface.canvas.height
                ? surface.canvas
                : null;
            this.materialManager.updateEditorOverlay(type, canvas);
            applied = true;
        });
        return applied;
    }

    exportLivery() {
        if (!this.canvas) {
            return;
        }
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        this._renderBaseComposite(exportCtx, { includeTemplate: this.showTemplate });
        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'livery.png';
        link.click();
    }

    _handleEditorEvent(event) {
        switch (event.type) {
            case 'reset':
                this.reset();
                this.ensureBaseLayers();
                break;
            case 'stateApplied':
                this.layerSurfaces.clear();
                this.state.layers.forEach((layer) => this.ensureLayerSurface(layer));
                this.renderComposite();
                break;
            case 'layerInserted':
                if (event.detail?.layer?.id) {
                    const layer = this.state.getLayerById(event.detail.layer.id);
                    this.ensureLayerSurface(layer);
                    this.renderLayer(layer.id);
                    this.renderComposite();
                }
                break;
            case 'layerDeleted':
                if (event.detail?.layerId) {
                    this.removeLayer(event.detail.layerId);
                    this.renderComposite();
                }
                break;
            case 'layersMerged':
                if (event.detail?.targetLayerId && event.detail?.sourceLayerId) {
                    const targetLayer = this.state.getLayerById(event.detail.targetLayerId);
                    if (targetLayer) {
                        this._hydrateLayer(targetLayer);
                        this.renderLayer(targetLayer.id);
                        this.renderComposite();
                    }
                    this.removeLayer(event.detail.sourceLayerId);
                }
                break;
            case 'activeLayerChanged':
                this.setActiveLayer(event.detail?.layerId ?? null);
                break;
            case 'activeToolChanged':
                this.setActiveTool(event.detail?.tool ?? this.state.activeTool);
                break;
            case 'symmetryChanged':
                if (event.detail?.settings) {
                    this.setMirrorSettings(event.detail.settings);
                }
                break;
            default:
                break;
        }
    }

    async _loadTemplateFromSelection() {
        const modelPath = this.state.currentModelPath;
        const liveryId = this.state.currentLivery;
        const liveryData = modelPath && liveryId ? globalThis.baseLiveries?.[modelPath]?.[liveryId] : null;

        let templateSrc = null;
        let decalsSrc = null;
        let sponsorsSrc = null;

        if (liveryData?.path) {
            const basePath = `models/${modelPath}/skins/custom/${liveryData.path}`;
            templateSrc = `${basePath}/EXT_Skin_Custom.png`;
            if (liveryData.hasDecals) {
                decalsSrc = `${basePath}/EXT_Skin_Decals.png`;
            }
            if (liveryData.sponsor) {
                sponsorsSrc = `${basePath}/EXT_Skin_Sponsors.png`;
            }
        }

        await this._loadTemplate(templateSrc);
        await this._applyBaseTexture('decals', decalsSrc || templateSrc);
        await this._applyBaseTexture('sponsors', sponsorsSrc);
        this.renderComposite();
    }

    async _loadTemplate(src) {
        if (!this.canvas) {
            return;
        }
        if (!src) {
            this.templateImage = null;
            this._ensureCanvasSize(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE);
            return;
        }
        const image = await this._loadImage(src).catch(() => null);
        if (image) {
            this.templateImage = image;
            this._ensureCanvasSize(image.width, image.height);
        } else {
            this.templateImage = null;
            this._ensureCanvasSize(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE);
        }
    }

    async _applyBaseTexture(type, src) {
        const layerId = type === 'sponsors' ? this.state.baseLayers?.sponsors : this.state.baseLayers?.decals;
        if (!layerId) {
            return;
        }
        const layer = this.state.getLayerById(layerId);
        if (!layer) {
            return;
        }
        const surface = this.ensureLayerSurface(layer);
        const items = layer.metadata.items;
        const existingIndex = items.findIndex((item) => item.role === type && item.type === 'image');

        if (!src) {
            if (existingIndex !== -1) {
                items.splice(existingIndex, 1);
            }
            this._hydrateLayer(layer);
            this.renderLayer(layer.id);
            return;
        }

        const baseItem = {
            id: this._generateItemId(`${type}-base`),
            type: 'image',
            role: type,
            src,
            width: this.canvas.width,
            height: this.canvas.height,
            opacity: 1,
            transform: {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
            },
        };

        if (existingIndex !== -1) {
            items.splice(existingIndex, 1, baseItem);
        } else {
            items.unshift(baseItem);
        }

        this.ensureLayerSurface(layer);
        const runtime = this._createRuntimeItem(layer.id, baseItem);
        const runtimeIndex = surface.items.findIndex((item) => item?.data?.role === type && item.data.type === 'image');
        if (runtimeIndex !== -1) {
            surface.items.splice(runtimeIndex, 1, runtime);
        } else {
            surface.items.unshift(runtime);
        }
        this.renderLayer(layer.id);
    }

    _hydrateLayer(layer) {
        const surface = this.layerSurfaces.get(layer.id);
        if (!surface) {
            return;
        }
        surface.items = [];
        layer.metadata.items.forEach((item) => {
            surface.items.push(this._createRuntimeItem(layer.id, item));
        });
    }

    _createRuntimeItem(layerId, item) {
        const runtime = {
            type: item.type,
            data: item,
        };
        item.id = item.id || this._generateItemId(item.type || 'item');

        if (!item.transform) {
            item.transform = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
            };
        }

        if (item.type === 'sticker' || item.type === 'image') {
            runtime.imagePromise = this._loadImage(item.src).then((image) => {
                runtime.image = image;
                if (!item.width) {
                    item.width = image.width;
                }
                if (!item.height) {
                    item.height = image.height;
                }
                this.renderLayer(layerId);
                this.renderComposite();
                return image;
            }).catch(() => null);
        }

        if (item.type === 'text') {
            this.measureContext.font = `${item.size || 48}px ${item.font || 'Arial'}`;
            const metrics = this.measureContext.measureText(item.content || '');
            item.metrics = {
                width: metrics.width,
                actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
                actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
            };
        }

        if (item.type === 'stroke' && Array.isArray(item.points)) {
            runtime.stroke = item;
        }

        return runtime;
    }

    _renderItem(ctx, item) {
        const data = item.data;
        if (!data) {
            return;
        }
        if (data.type === 'stroke') {
            this._renderStroke(ctx, data);
            return;
        }
        if (data.type === 'text') {
            this._renderText(ctx, data);
            return;
        }
        if (data.type === 'sticker' || data.type === 'image') {
            if (item.image) {
                this._renderImage(ctx, data, item.image);
            }
            return;
        }
    }

    _renderImage(ctx, data, image) {
        const transform = data.transform || {};
        const width = data.width || image.width;
        const height = data.height || image.height;
        ctx.save();
        ctx.globalAlpha = data.opacity ?? 1;
        ctx.translate(transform.x ?? 0, transform.y ?? 0);
        ctx.rotate(transform.rotation || 0);
        ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
        ctx.restore();
    }

    _renderText(ctx, data) {
        const transform = data.transform || {};
        ctx.save();
        ctx.translate(transform.x ?? 0, transform.y ?? 0);
        ctx.rotate(transform.rotation || 0);
        ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);
        ctx.globalAlpha = data.opacity ?? 1;
        ctx.fillStyle = data.color || '#ffffff';
        ctx.font = `${data.size || 48}px ${data.font || 'Arial'}`;
        ctx.textAlign = data.align || 'center';
        ctx.textBaseline = data.baseline || 'middle';
        ctx.fillText(data.content || '', 0, 0);
        ctx.restore();
    }

    _renderStroke(ctx, stroke) {
        if (!stroke.points || stroke.points.length < 1) {
            return;
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.opacity ?? 1;
        ctx.lineWidth = stroke.size ?? 10;
        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.shadowBlur = 0;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color || this.brushSettings.color;
            const softness = Math.min(1, Math.max(0, 1 - (stroke.hardness ?? this.brushSettings.hardness)));
            ctx.shadowBlur = softness * (stroke.size ?? 10) * 0.5;
            ctx.shadowColor = ctx.strokeStyle;
        }
        const [first, ...rest] = stroke.points;
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        rest.forEach((point) => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
    }

    _drawFallbackBackground(ctx = this.ctx) {
        if (!ctx) {
            return;
        }
        const canvasWidth = ctx.canvas?.width ?? this.canvas?.width ?? 0;
        const canvasHeight = ctx.canvas?.height ?? this.canvas?.height ?? 0;
        const size = 64;
        for (let y = 0; y < canvasHeight; y += size) {
            for (let x = 0; x < canvasWidth; x += size) {
                const isDark = ((x / size) + (y / size)) % 2 === 0;
                ctx.fillStyle = isDark ? '#2c2c2c' : '#3a3a3a';
                ctx.fillRect(x, y, size, size);
            }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvasWidth; x += size) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= canvasHeight; y += size) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    }

    _attachInputHandlers() {
        if (!this.canvas) {
            return;
        }
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
        this.canvas.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        this.canvas.addEventListener('pointerleave', this._onPointerUp);
    }

    _onPointerDown(event) {
        if (!this.canvas) {
            return;
        }
        const layerId = this.state.activeLayerId || this.state.baseLayers?.decals;
        if (!layerId) {
            return;
        }
        const coords = this._getCanvasCoordinates(event);
        const layer = this.state.getLayerById(layerId);
        if (!layer) {
            return;
        }
        const isLocked = Boolean(layer.locked);

        const selectedItem = this.selection?.layerId === layerId ? this._getSelectedRuntimeItem() : null;
        if (selectedItem && !isLocked) {
            const handle = this._hitTestHandles(coords);
            if (handle) {
                this.pendingSnapshot = this.state.captureEditorState();
                this.pointerState = {
                    mode: handle.type === 'rotate' ? 'rotate' : 'scale',
                    item: selectedItem,
                    layerId,
                    startX: coords.x,
                    startY: coords.y,
                    initialTransform: { ...selectedItem.data.transform },
                    rotationOffset: handle.type === 'rotate'
                        ? this._computeRotationOffset(selectedItem.data.transform, coords.x, coords.y)
                        : null,
                    mirrorItem: this._findMirrorItem(layerId, selectedItem),
                    handle,
                    baseWidth: this._getItemWidth(selectedItem) || 1,
                    baseHeight: this._getItemHeight(selectedItem) || 1,
                    scaleSignX: (selectedItem.data.transform?.scaleX ?? 1) >= 0 ? 1 : -1,
                    scaleSignY: (selectedItem.data.transform?.scaleY ?? 1) >= 0 ? 1 : -1,
                };
                this._setCanvasCursor('grabbing');
                return;
            }
        }

        const hit = this._hitTest(layerId, coords.x, coords.y);
        if (hit) {
            this._setSelection(layerId, hit);
            if (isLocked) {
                return;
            }
            this.pendingSnapshot = this.state.captureEditorState();
            const mode = event.shiftKey ? 'rotate' : 'move';
            this.pointerState = {
                mode,
                item: hit,
                layerId,
                startX: coords.x,
                startY: coords.y,
                initialTransform: { ...hit.data.transform },
                rotationOffset: this._computeRotationOffset(hit.data.transform, coords.x, coords.y),
                mirrorItem: this._findMirrorItem(layerId, hit),
            };
            this._setCanvasCursor('grabbing');
            return;
        }

        this._clearSelection();
        if (isLocked) {
            return;
        }

        const tool = this.activeTool || this.state.activeTool || 'brush';
        if (tool === 'brush' || tool === 'eraser') {
            this.pendingSnapshot = this.state.captureEditorState();
            const stroke = this._createStroke(tool, coords);
            const mirrorStroke = this._maybeCreateMirroredStroke(stroke);
            this.pointerState = {
                mode: 'stroke',
                layerId,
                stroke,
                mirrorStroke,
            };
            this.renderLayer(layerId, {
                previewStroke: stroke,
                previewMirrors: mirrorStroke ? [mirrorStroke] : [],
            });
            this.renderComposite();
        }
    }

    _onPointerMove(event) {
        if (!this.canvas) {
            return;
        }
        const coords = this._getCanvasCoordinates(event);

        if (!this.pointerState) {
            const layerId = this.state.activeLayerId || this.state.baseLayers?.decals;
            const layer = layerId ? this.state.getLayerById(layerId) : null;
            this._handleHoverState(coords, layer);
            return;
        }

        if (this.pointerState.mode === 'stroke') {
            this.pointerState.stroke.points.push({ x: coords.x, y: coords.y });
            if (this.pointerState.mirrorStroke) {
                const mirroredPoint = this._mirrorPoint(coords.x, coords.y);
                this.pointerState.mirrorStroke.points.push(mirroredPoint);
            }
            this.renderLayer(this.pointerState.layerId, {
                previewStroke: this.pointerState.stroke,
                previewMirrors: this.pointerState.mirrorStroke ? [this.pointerState.mirrorStroke] : [],
            });
            this.renderComposite();
            return;
        }

        if (this.pointerState.mode === 'select') {
            return;
        }

        if (this.pointerState.mode === 'move' && this.pointerState.item) {
            const dx = coords.x - this.pointerState.startX;
            const dy = coords.y - this.pointerState.startY;
            const transform = this.pointerState.item.data.transform;
            transform.x = this.pointerState.initialTransform.x + dx;
            transform.y = this.pointerState.initialTransform.y + dy;
            if (this.pointerState.mirrorItem) {
                this._updateMirrorTransform(this.pointerState.item.data.transform, this.pointerState.mirrorItem.data.transform);
            }
            this.renderLayer(this.pointerState.layerId);
            this.renderComposite();
            this._setCanvasCursor('grabbing');
            return;
        }

        if (this.pointerState.mode === 'rotate' && this.pointerState.item) {
            const transform = this.pointerState.item.data.transform;
            const dx = coords.x - transform.x;
            const dy = coords.y - transform.y;
            const currentAngle = Math.atan2(dy, dx);
            const offset = this.pointerState.rotationOffset || 0;
            let rotation = currentAngle - offset;
            const snap = event.altKey || event.ctrlKey || event.metaKey;
            if (snap) {
                const increment = Math.PI / 12;
                rotation = Math.round(rotation / increment) * increment;
            }
            transform.rotation = rotation;
            if (this.pointerState.mirrorItem) {
                this._updateMirrorTransform(transform, this.pointerState.mirrorItem.data.transform, true);
            }
            this.renderLayer(this.pointerState.layerId);
            this.renderComposite();
            this._setCanvasCursor('grabbing');
            return;
        }

        if (this.pointerState.mode === 'scale' && this.pointerState.item && this.pointerState.handle) {
            this._applyScaleFromPointer(coords, event.shiftKey);
            if (this.pointerState.mirrorItem) {
                this._updateMirrorTransform(this.pointerState.item.data.transform, this.pointerState.mirrorItem.data.transform);
            }
            this.renderLayer(this.pointerState.layerId);
            this.renderComposite();
            this._setCanvasCursor('grabbing');
        }
    }

    _onPointerUp() {
        if (!this.pointerState) {
            this._setCanvasCursor('default');
            return;
        }
        if (this.pointerState.mode === 'stroke') {
            const layer = this.state.getLayerById(this.pointerState.layerId);
            if (layer) {
                layer.metadata.items.push(this.pointerState.stroke);
                const surface = this.ensureLayerSurface(layer);
                surface.items.push(this._createRuntimeItem(layer.id, this.pointerState.stroke));
                if (this.pointerState.mirrorStroke) {
                    layer.metadata.items.push(this.pointerState.mirrorStroke);
                    surface.items.push(this._createRuntimeItem(layer.id, this.pointerState.mirrorStroke));
                }
                this.renderLayer(layer.id);
                this.renderComposite();
                this.state.markLayerDirty(layer.id);
            }
        } else if ((this.pointerState.mode === 'move' || this.pointerState.mode === 'rotate' || this.pointerState.mode === 'scale')
            && this.pointerState.layerId) {
            this.state.markLayerDirty(this.pointerState.layerId);
        }

        if (this.pendingSnapshot) {
            this.state.recordUndoState(this.pendingSnapshot);
            this.pendingSnapshot = null;
        }
        this.pointerState = null;
        this._setCanvasCursor('default');
    }

    _handleHoverState(coords, layer) {
        if (!this.canvas) {
            return;
        }
        if (layer && !layer.locked && this.selection?.layerId === layer.id) {
            const handle = this._hitTestHandles(coords);
            if (handle) {
                this._setCanvasCursor(handle.cursor || 'pointer');
                return;
            }
        }
        if (!layer || layer.locked) {
            this._setCanvasCursor('default');
            return;
        }
        const hit = this._hitTest(layer.id, coords.x, coords.y);
        if (hit) {
            this._setCanvasCursor('move');
        } else {
            this._setCanvasCursor('default');
        }
    }

    _hitTestHandles(coords) {
        if (!Array.isArray(this.selectionHandles) || !this.selectionHandles.length) {
            return null;
        }
        for (let index = 0; index < this.selectionHandles.length; index += 1) {
            const handle = this.selectionHandles[index];
            if (!handle) {
                continue;
            }
            const radius = handle.radius ?? this.handleRadius;
            const dx = coords.x - handle.x;
            const dy = coords.y - handle.y;
            if (Math.hypot(dx, dy) <= radius) {
                return handle;
            }
        }
        return null;
    }

    _drawSelectionOverlay(ctx) {
        if (!ctx || !this.selection) {
            this.selectionHandles = [];
            return;
        }
        const runtime = this._getSelectedRuntimeItem();
        if (!runtime || !runtime.data) {
            this.selection = null;
            this.selectionHandles = [];
            return;
        }
        const width = this._getItemWidth(runtime);
        const height = this._getItemHeight(runtime);
        if (!width || !height) {
            this.selectionHandles = [];
            return;
        }
        const transform = runtime.data.transform || {};
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const corners = [
            this._transformPoint(transform, -halfWidth, -halfHeight),
            this._transformPoint(transform, halfWidth, -halfHeight),
            this._transformPoint(transform, halfWidth, halfHeight),
            this._transformPoint(transform, -halfWidth, halfHeight),
        ];

        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(13, 110, 253, 0.9)';
        ctx.fillStyle = 'rgba(13, 110, 253, 0.85)';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i += 1) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        const handles = this._computeSelectionHandles(transform, width, height);
        this.selectionHandles = handles;
        const rotationHandle = handles.find((handle) => handle.type === 'rotate');
        if (rotationHandle?.anchor) {
            ctx.beginPath();
            ctx.moveTo(rotationHandle.anchor.x, rotationHandle.anchor.y);
            ctx.lineTo(rotationHandle.x, rotationHandle.y);
            ctx.stroke();
        }

        handles.forEach((handle) => {
            ctx.beginPath();
            if (handle.type === 'rotate') {
                ctx.arc(handle.x, handle.y, handle.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                const size = (handle.radius ?? this.handleRadius) * 1.4;
                ctx.rect(handle.x - size / 2, handle.y - size / 2, size, size);
                ctx.fill();
                ctx.stroke();
            }
        });
        ctx.restore();
    }

    _computeSelectionHandles(transform, width, height) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const definitions = [
            { key: 'nw', sx: -1, sy: -1, cursor: 'nwse-resize' },
            { key: 'ne', sx: 1, sy: -1, cursor: 'nesw-resize' },
            { key: 'se', sx: 1, sy: 1, cursor: 'nwse-resize' },
            { key: 'sw', sx: -1, sy: 1, cursor: 'nesw-resize' },
            { key: 'n', sx: 0, sy: -1, cursor: 'ns-resize' },
            { key: 'e', sx: 1, sy: 0, cursor: 'ew-resize' },
            { key: 's', sx: 0, sy: 1, cursor: 'ns-resize' },
            { key: 'w', sx: -1, sy: 0, cursor: 'ew-resize' },
        ];
        const handles = definitions.map((def) => {
            const point = this._transformPoint(transform, halfWidth * def.sx, halfHeight * def.sy);
            return {
                ...def,
                type: 'scale',
                x: point.x,
                y: point.y,
                radius: this.handleRadius,
            };
        });
        const topCenter = this._transformPoint(transform, 0, -halfHeight);
        const rotationPoint = this._transformPoint(transform, 0, -(halfHeight + this.rotationHandleOffset));
        handles.push({
            type: 'rotate',
            cursor: 'grab',
            x: rotationPoint.x,
            y: rotationPoint.y,
            radius: this.handleRadius + 2,
            anchor: topCenter,
        });
        return handles;
    }

    _setSelection(layerId, item) {
        if (!item || !item.data || !item.data.id) {
            return;
        }
        const nextSelection = { layerId, itemId: item.data.id };
        if (this.selection && this.selection.layerId === nextSelection.layerId && this.selection.itemId === nextSelection.itemId) {
            return;
        }
        this.selection = nextSelection;
        this.renderComposite();
    }

    _clearSelection(triggerRender = true) {
        if (!this.selection) {
            return;
        }
        this.selection = null;
        this.selectionHandles = [];
        if (triggerRender) {
            this.renderComposite();
        }
    }

    _getSelectedRuntimeItem() {
        if (!this.selection) {
            return null;
        }
        const surface = this.layerSurfaces.get(this.selection.layerId);
        if (!surface) {
            return null;
        }
        return surface.items.find((item) => item?.data?.id === this.selection.itemId) || null;
    }

    _setCanvasCursor(cursor) {
        if (!this.canvas) {
            return;
        }
        const value = cursor || 'default';
        if (this.currentCursor === value) {
            return;
        }
        this.canvas.style.cursor = value;
        this.currentCursor = value;
    }

    _applyScaleFromPointer(coords, uniformScaling) {
        if (!this.pointerState?.item || !this.pointerState.handle) {
            return;
        }
        const { item, handle, baseWidth, baseHeight, scaleSignX = 1, scaleSignY = 1 } = this.pointerState;
        const transform = item.data.transform || {};
        const originX = transform.x ?? 0;
        const originY = transform.y ?? 0;
        const rotation = transform.rotation || 0;
        const dx = coords.x - originX;
        const dy = coords.y - originY;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        const halfWidth = Math.max(1, baseWidth / 2);
        const halfHeight = Math.max(1, baseHeight / 2);

        if (handle.sx !== 0) {
            const scaleMagnitudeX = Math.max(0.05, Math.abs(rotatedX) / halfWidth);
            transform.scaleX = scaleMagnitudeX * scaleSignX;
        }
        if (handle.sy !== 0) {
            const scaleMagnitudeY = Math.max(0.05, Math.abs(rotatedY) / halfHeight);
            transform.scaleY = scaleMagnitudeY * scaleSignY;
        }

        if (uniformScaling && handle.sx !== 0 && handle.sy !== 0) {
            const uniformScale = Math.max(
                0.05,
                Math.max(Math.abs(rotatedX) / halfWidth, Math.abs(rotatedY) / halfHeight)
            );
            transform.scaleX = uniformScale * scaleSignX;
            transform.scaleY = uniformScale * scaleSignY;
        }
    }

    _transformPoint(transform = {}, localX = 0, localY = 0) {
        const scaleX = transform.scaleX ?? 1;
        const scaleY = transform.scaleY ?? 1;
        const rotation = transform.rotation || 0;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const scaledX = localX * scaleX;
        const scaledY = localY * scaleY;
        const x = (transform.x ?? 0) + (scaledX * cos - scaledY * sin);
        const y = (transform.y ?? 0) + (scaledX * sin + scaledY * cos);
        return { x, y };
    }

    _hitTest(layerId, x, y) {
        const surface = this.layerSurfaces.get(layerId);
        if (!surface) {
            return null;
        }
        for (let i = surface.items.length - 1; i >= 0; i -= 1) {
            const item = surface.items[i];
            if (!item || !item.data || item.data.type === 'stroke' || item.data.role) {
                continue;
            }
            if (this._pointInItem(x, y, item)) {
                return item;
            }
        }
        return null;
    }

    _pointInItem(x, y, item) {
        const transform = item.data.transform || {};
        const width = this._getItemWidth(item);
        const height = this._getItemHeight(item);
        const dx = x - (transform.x ?? 0);
        const dy = y - (transform.y ?? 0);
        const angle = -(transform.rotation || 0);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = (dx * cos - dy * sin) / (transform.scaleX ?? 1);
        const localY = (dx * sin + dy * cos) / (transform.scaleY ?? 1);
        return localX >= -width / 2 && localX <= width / 2 && localY >= -height / 2 && localY <= height / 2;
    }

    _getItemWidth(item) {
        if (item.data.type === 'text' && item.data.metrics) {
            return item.data.metrics.width || (item.data.size || 48);
        }
        return item.data.width || item.image?.width || 0;
    }

    _getItemHeight(item) {
        if (item.data.type === 'text' && item.data.metrics) {
            return (item.data.metrics.actualBoundingBoxAscent + item.data.metrics.actualBoundingBoxDescent) || (item.data.size || 48);
        }
        return item.data.height || item.image?.height || 0;
    }

    _createStroke(tool, startPoint) {
        return {
            id: this._generateItemId('stroke'),
            type: 'stroke',
            tool,
            color: this.brushSettings.color,
            size: this.brushSettings.size,
            opacity: this.brushSettings.opacity,
            hardness: this.brushSettings.hardness,
            points: [{ x: startPoint.x, y: startPoint.y }],
        };
    }

    _maybeCreateMirroredStroke(stroke) {
        if (!this.mirrorSettings?.enabled) {
            return null;
        }
        const mirrored = JSON.parse(JSON.stringify(stroke));
        mirrored.id = this._generateItemId('stroke-mirror');
        mirrored.mirrorOf = stroke.id;
        mirrored.points = stroke.points.map((point) => this._mirrorPoint(point.x, point.y));
        if (this.mirrorSettings.mode === 'flip') {
            mirrored.points.reverse();
        }
        return mirrored;
    }

    _maybeCreateMirroredItem(layer, item) {
        if (!this.mirrorSettings?.enabled) {
            return null;
        }
        const mirrored = JSON.parse(JSON.stringify(item));
        mirrored.id = this._generateItemId(`${item.type}-mirror`);
        mirrored.mirrorOf = item.id;
        mirrored.transform = this._mirrorTransform(item.transform);
        if (mirrored.type === 'sticker' || mirrored.type === 'image') {
            mirrored.transform.scaleX *= -1;
        }
        return mirrored;
    }

    _maybeCreateMirroredText(layer, item) {
        if (!this.mirrorSettings?.enabled) {
            return null;
        }
        const mirrored = JSON.parse(JSON.stringify(item));
        mirrored.id = this._generateItemId('text-mirror');
        mirrored.mirrorOf = item.id;
        mirrored.transform = this._mirrorTransform(item.transform);
        mirrored.transform.scaleX *= -1;
        if (this.mirrorSettings.mode === 'flip') {
            mirrored.content = (mirrored.content || '').split('').reverse().join('');
        }
        return mirrored;
    }

    _mirrorTransform(transform = {}) {
        const mirrored = { ...transform };
        const axis = this.mirrorSettings?.axis || MIRROR_AXIS.x;
        if (axis === MIRROR_AXIS.y) {
            mirrored.y = this.canvas.height - (transform.y ?? 0);
        } else {
            const width = this.canvas.width;
            mirrored.x = width - (transform.x ?? 0);
        }
        if (axis === MIRROR_AXIS.z) {
            const width = this.canvas.width;
            mirrored.x = width - (transform.x ?? 0);
        }
        mirrored.rotation = -(transform.rotation || 0);
        mirrored.scaleY = transform.scaleY ?? 1;
        mirrored.scaleX = transform.scaleX ?? 1;
        return mirrored;
    }

    _mirrorPoint(x, y) {
        const axis = this.mirrorSettings?.axis || MIRROR_AXIS.x;
        if (axis === MIRROR_AXIS.y) {
            return { x, y: this.canvas.height - y };
        }
        const width = this.canvas.width;
        return { x: width - x, y };
    }

    _updateMirrorTransform(source, target, invertRotation = false) {
        const mirrored = this._mirrorTransform(source);
        target.x = mirrored.x;
        target.y = mirrored.y;
        target.scaleX = mirrored.scaleX * (target.scaleX < 0 ? -1 : 1);
        target.scaleY = mirrored.scaleY;
        target.rotation = invertRotation ? -source.rotation : mirrored.rotation;
    }

    _computeRotationOffset(transform, x, y) {
        const dx = x - (transform.x ?? 0);
        const dy = y - (transform.y ?? 0);
        const startAngle = Math.atan2(dy, dx);
        return startAngle - (transform.rotation || 0);
    }

    _findMirrorItem(layerId, item) {
        const surface = this.layerSurfaces.get(layerId);
        if (!surface) {
            return null;
        }
        return surface.items.find((candidate) => candidate?.data?.mirrorOf === item.data.id || candidate?.data?.id === item.data.mirrorOf) || null;
    }

    _ensureCanvasSize(width, height) {
        if (!this.canvas) {
            return;
        }
        if (this.canvas.width === width && this.canvas.height === height) {
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.layerSurfaces.forEach((surface) => {
            surface.canvas.width = width;
            surface.canvas.height = height;
        });
        this.compositeSurfaces.forEach((surface) => {
            surface.canvas.width = width;
            surface.canvas.height = height;
        });
    }

    _getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
        return { x, y };
    }

    _generateItemId(prefix) {
        if (typeof globalThis.crypto?.randomUUID === 'function') {
            return `${prefix}-${globalThis.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _loadImage(src) {
        if (!src) {
            return Promise.reject(new Error('Missing image source'));
        }
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src);
        }
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            if (!src.startsWith('data:')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            img.src = src;
        });
        this.imageCache.set(src, promise);
        return promise;
    }

    async _onBaseTextureChange(event) {
        const detail = event?.detail;
        if (!detail) {
            return;
        }
        if (detail.type === 'decals' || detail.type === 'sponsors') {
            await this._applyBaseTexture(detail.type, detail.url);
            this.renderComposite();
        }
    }

    async _onBaseLayersReady(event) {
        await this._loadTemplateFromSelection();
    }
}

