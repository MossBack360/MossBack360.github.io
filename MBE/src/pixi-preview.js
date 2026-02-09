import { createRegularPolygonPoints } from "./geometry.js";
import { createShapeModel, getScaledParams, cloneShapeModel } from "./model.js";

export class PixiPreview {
    constructor(container, state, callbacks) {
        this.container = container;
        this.state = state;
        this.callbacks = callbacks;
        this.app = null;
        this.stageRoot = null;
        this.backgroundSprite = null;
        this.shapeMap = new Map();
        this.activeDrag = null;
        this.gizmo = null;
    }

    init() {
        this.app = new window.PIXI.Application({
            background: 0xffffff,
            antialias: true,
            resizeTo: this.container
        });
        this.container.appendChild(this.app.view);
        this.stageRoot = new window.PIXI.Container();
        this.app.stage.addChild(this.stageRoot);
        this.stageRoot.eventMode = "static";
        this.stageRoot.hitArea = this.app.screen;
        this.stageRoot.on("pointerdown", this.onStagePointerDown.bind(this));
        this.app.stage.eventMode = "static";
        this.initGizmo();
        this.app.renderer.on("resize", () => {
            this.stageRoot.hitArea = this.app.screen;
            if (this.backgroundSprite) {
                this.backgroundSprite.position.set(
                    this.app.screen.width / 2,
                    this.app.screen.height / 2
                );
            }
        });
        window.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    initGizmo() {
        const gizmo = new window.PIXI.Container();
        gizmo.visible = false;

        const box = new window.PIXI.Graphics();
        box.lineStyle(1, 0x0b4ea2, 1);
        box.drawRect(-50, -30, 100, 60);
        box.endFill();

        const scaleHandle = new window.PIXI.Graphics();
        scaleHandle.beginFill(0x0b4ea2);
        scaleHandle.drawRect(-6, -6, 12, 12);
        scaleHandle.endFill();
        scaleHandle.cursor = "nwse-resize";
        scaleHandle.eventMode = "static";
        scaleHandle.on("pointerdown", (event) => this.startTransform("scale", event));

        const rotateHandle = new window.PIXI.Graphics();
        rotateHandle.beginFill(0x0b4ea2);
        rotateHandle.drawCircle(0, 0, 6);
        rotateHandle.endFill();
        rotateHandle.cursor = "grab";
        rotateHandle.eventMode = "static";
        rotateHandle.on("pointerdown", (event) => this.startTransform("rotate", event));

        gizmo.addChild(box, scaleHandle, rotateHandle);
        gizmo.box = box;
        gizmo.scaleHandle = scaleHandle;
        gizmo.rotateHandle = rotateHandle;
        this.gizmo = gizmo;
        this.app.stage.addChild(gizmo);
    }

    onKeyDown(event) {
        const tagName = event.target && event.target.tagName;
        if (tagName === "INPUT" || tagName === "TEXTAREA") {
            return;
        }
        if (event.key === "Delete" && this.state.selectedId) {
            this.removeShape(this.state.selectedId);
            this.callbacks.onSelectionChange(null);
            return;
        }
        if (!this.state.selectedId) {
            return;
        }
        const step = event.shiftKey ? 10 : 1;
        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.nudgeSelection(0, -step);
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            this.nudgeSelection(0, step);
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            this.nudgeSelection(-step, 0);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            this.nudgeSelection(step, 0);
        }
    }

    onStagePointerDown(event) {
        if (event.target !== this.stageRoot) {
            return;
        }
        const position = event.data.global;
        if (this.state.currentTool === "paste") {
            this.addPastedShapeAtPosition(position);
            return;
        }
        if (this.state.currentTool === "vertices") {
            this.addVertexPoint(position);
            return;
        }
        this.addShapeAt(position);
    }

    addShapeAt(position) {
        const params = this.state.toolParams[this.state.currentTool];
        const model = createShapeModel(this.state.currentTool, params, position);
        this.state.shapes.push(model);
        this.createDisplayForModel(model);
        this.selectModel(model.id);
        this.callbacks.onShapeListChange(this.state.shapes);
    }

    addVertexPoint(position) {
        const focused = this.getSelectedModel();
        let model = this.state.shapes.find((shape) => shape.type === "vertices" && shape.id === (focused && focused.id));
        if (!model || this.state.verticesMode.createNew) {
            const params = this.state.toolParams.vertices || { chamfer: 0 };
            model = createShapeModel("vertices", params, position);
            model.params.vertices = [{ x: 0, y: 0 }];
            model.angle = 0;
            model.scaleX = 1;
            model.scaleY = 1;
            model.params.vertexChamfers = [model.params.chamfer || 0];
            model.params.usePerVertex = false;
            this.state.shapes.push(model);
            this.createDisplayForModel(model);
            this.state.verticesMode.createNew = false;
        } else {
            const local = this.getLocalDelta(position, model.position, model.angle);
            const x = local.x / (model.scaleX ?? 1);
            const y = local.y / (model.scaleY ?? 1);
            model.params.vertices = model.params.vertices || [];
            model.params.vertices.push({ x, y });
            if (model.params.vertexChamfers) {
                model.params.vertexChamfers.push(model.params.chamfer || 0);
            }
        }
        this.selectModel(model.id);
        this.updateDisplayFromModel(model);
        this.callbacks.onShapeListChange(this.state.shapes);
    }

    addPastedShapeAtPosition(position) {
        if (!this.state.clipboard) {
            return;
        }
        const model = cloneShapeModel(this.state.clipboard, position);
        if (model.type === "vertices") {
            const vertices = model.params.vertices || [];
            if (!model.params.vertexChamfers || model.params.vertexChamfers.length !== vertices.length) {
                model.params.vertexChamfers = vertices.map(() => model.params.chamfer || 0);
            }
        }
        this.state.shapes.push(model);
        this.createDisplayForModel(model);
        this.selectModel(model.id);
        this.callbacks.onShapeListChange(this.state.shapes);
    }

    nudgeSelection(dx, dy) {
        const model = this.getSelectedModel();
        if (!model) {
            return;
        }
        model.position.x += dx;
        model.position.y += dy;
        this.updateDisplayFromModel(model);
        this.callbacks.onShapeChange(model);
    }

    removeShape(id) {
        const index = this.state.shapes.findIndex((shape) => shape.id === id);
        if (index === -1) {
            return;
        }
        const model = this.state.shapes[index];
        const display = this.shapeMap.get(model.id);
        if (display) {
            display.destroy({ children: true });
        }
        this.shapeMap.delete(model.id);
        this.state.shapes.splice(index, 1);
        if (this.state.selectedId === id) {
            this.state.selectedId = null;
            this.gizmo.visible = false;
        }
        this.callbacks.onShapeListChange(this.state.shapes);
    }

    selectModel(id) {
        this.state.selectedId = id;
        const model = this.getSelectedModel();
        this.callbacks.onSelectionChange(model);
        if (model) {
            this.updateGizmo(model);
            this.gizmo.visible = true;
        } else {
            this.gizmo.visible = false;
        }
    }

    getSelectedModel() {
        return this.state.shapes.find((shape) => shape.id === this.state.selectedId) || null;
    }

    createDisplayForModel(model) {
        const container = new window.PIXI.Container();
        container.eventMode = "static";
        container.cursor = "move";
        container.on("pointerdown", (event) => this.onShapePointerDown(event, model));

        const graphics = new window.PIXI.Graphics();
        graphics.beginFill(0x92b5e9, 0.5);
        graphics.lineStyle(2, 0x2c4e7a, 1);
        this.drawShape(graphics, model);
        graphics.endFill();

        container.addChild(graphics);
        if (model.type === "vertices") {
            const handles = new window.PIXI.Graphics();
            container.addChild(handles);
            container.handles = handles;
        }
        container.modelId = model.id;
        this.stageRoot.addChild(container);

        this.shapeMap.set(model.id, container);
        this.updateDisplayFromModel(model);
    }

    drawShape(graphics, model) {
        graphics.clear();
        graphics.beginFill(0x92b5e9, 0.5);
        graphics.lineStyle(2, 0x2c4e7a, 1);
        if (model.type === "rectangle") {
            const chamfer = Math.max(0, model.params.chamfer || 0);
            if (chamfer > 0) {
                graphics.drawRoundedRect(
                    -model.params.width / 2,
                    -model.params.height / 2,
                    model.params.width,
                    model.params.height,
                    chamfer
                );
            } else {
                graphics.drawRect(
                    -model.params.width / 2,
                    -model.params.height / 2,
                    model.params.width,
                    model.params.height
                );
            }
        } else if (model.type === "circle") {
            graphics.drawCircle(0, 0, model.params.radius);
        } else if (model.type === "polygon") {
            const points = createRegularPolygonPoints(model.params.sides, model.params.radius);
            graphics.drawPolygon(points.flatMap((point) => [point.x, point.y]));
        } else if (model.type === "vertices") {
            const vertices = model.params.vertices || [];
            if (vertices.length >= 2) {
                graphics.drawPolygon(vertices.flatMap((point) => [point.x, point.y]));
            } else if (vertices.length === 1) {
                graphics.drawCircle(vertices[0].x, vertices[0].y, 4);
            }
        }
        graphics.endFill();
    }

    updateDisplayFromModel(model) {
        const display = this.shapeMap.get(model.id);
        if (!display) {
            return;
        }
        const graphics = display.children[0];
        this.drawShape(graphics, model);
        if (model.type === "vertices" && display.handles) {
            this.drawVertexHandles(display.handles, model);
        }
        display.position.set(model.position.x, model.position.y);
        display.rotation = model.angle;
        display.scale.set(model.scaleX ?? 1, model.scaleY ?? 1);
        if (this.state.selectedId === model.id) {
            this.updateGizmo(model);
        }
    }

    drawVertexHandles(handles, model) {
        handles.clear();
        if (!model.params.vertices) {
            return;
        }
        handles.beginFill(0x0b4ea2);
        model.params.vertices.forEach((vertex) => {
            handles.drawCircle(vertex.x, vertex.y, 4);
        });
        handles.endFill();
    }

    onShapePointerDown(event, model) {
        if (model.type === "vertices" && event.data.originalEvent && event.data.originalEvent.ctrlKey) {
            const local = event.data.getLocalPosition(event.currentTarget);
            const index = this.findVertexIndex(model, local, 10);
            if (index !== -1) {
                event.currentTarget.cursor = "grabbing";
                this.startVertexDrag(event, model, index);
                return;
            }
        }
        this.startTransform("move", event, model);
    }

    findVertexIndex(model, localPoint, radius) {
        const vertices = model.params.vertices || [];
        for (let i = 0; i < vertices.length; i += 1) {
            const dx = vertices[i].x - localPoint.x;
            const dy = vertices[i].y - localPoint.y;
            if (Math.hypot(dx, dy) <= radius) {
                return i;
            }
        }
        return -1;
    }

    startVertexDrag(event, model, index) {
        event.stopPropagation();
        this.selectModel(model.id);
        this.activeDrag = {
            mode: "vertex",
            model,
            vertexIndex: index
        };
        this.app.stage.on("pointermove", this.onPointerMove, this);
        this.app.stage.on("pointerup", this.onPointerUp, this);
        this.app.stage.on("pointerupoutside", this.onPointerUp, this);
    }

    updateGizmo(model) {
        const params = getScaledParams(model);
        let width = 80;
        let height = 60;
        if (model.type === "vertices") {
            const vertices = model.params.vertices || [];
            if (vertices.length) {
                let minX = vertices[0].x;
                let maxX = vertices[0].x;
                let minY = vertices[0].y;
                let maxY = vertices[0].y;
                vertices.forEach((point) => {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                });
                width = (maxX - minX) * (model.scaleX ?? 1);
                height = (maxY - minY) * (model.scaleY ?? 1);
            }
        } else if (model.type === "circle") {
            width = params.radiusX * 2;
            height = params.radiusY * 2;
        } else {
            width = params.width || params.radiusX * 2;
            height = params.height || params.radiusY * 2;
        }
        width = Math.max(12, width);
        height = Math.max(12, height);

        this.gizmo.position.set(model.position.x, model.position.y);
        this.gizmo.rotation = model.angle;
        this.gizmo.box.clear();
        this.gizmo.box.lineStyle(1, 0x0b4ea2, 1);
        this.gizmo.box.drawRect(-width / 2, -height / 2, width, height);
        this.gizmo.box.endFill();
        this.gizmo.scaleHandle.position.set(width / 2, height / 2);
        this.gizmo.rotateHandle.position.set(0, -height / 2 - 18);
        this.gizmo.rotateHandle.visible = model.type !== "circle";
    }

    startTransform(mode, event, modelOverride) {
        const model = modelOverride || this.getSelectedModel();
        if (!model) {
            return;
        }
        event.stopPropagation();
        this.selectModel(model.id);

        const center = { x: model.position.x, y: model.position.y };
        const start = { x: event.data.global.x, y: event.data.global.y };
        const localStart = this.getLocalDelta(start, center, model.angle);

        this.activeDrag = {
            mode,
            model,
            start,
            center,
            startAngle: model.angle,
            startScaleX: model.scaleX ?? 1,
            startScaleY: model.scaleY ?? 1,
            startDistance: Math.hypot(start.x - center.x, start.y - center.y),
            startLocalX: localStart.x,
            startLocalY: localStart.y
        };

        this.app.stage.on("pointermove", this.onPointerMove, this);
        this.app.stage.on("pointerup", this.onPointerUp, this);
        this.app.stage.on("pointerupoutside", this.onPointerUp, this);
    }

    onPointerMove(event) {
        if (!this.activeDrag) {
            return;
        }
        const { mode, model, start, center, startAngle, startScaleX, startScaleY, startDistance, startLocalX, startLocalY } = this.activeDrag;
        const current = event.data.global;
        if (mode === "move") {
            model.position = {
                x: center.x + (current.x - start.x),
                y: center.y + (current.y - start.y)
            };
        } else if (mode === "rotate") {
            const angle = Math.atan2(current.y - center.y, current.x - center.x);
            const startAngleDrag = Math.atan2(start.y - center.y, start.x - center.x);
            model.angle = startAngle + (angle - startAngleDrag);
        } else if (mode === "scale") {
            const minScale = 0.1;
            const localCurrent = this.getLocalDelta(current, center, model.angle);
            if (event.data.originalEvent && event.data.originalEvent.shiftKey) {
                const nextScaleX = this.computeAxisScale(startLocalX, localCurrent.x, startScaleX, minScale);
                const nextScaleY = this.computeAxisScale(startLocalY, localCurrent.y, startScaleY, minScale);
                model.scaleX = nextScaleX;
                model.scaleY = nextScaleY;
            } else {
                const distance = Math.max(10, Math.hypot(current.x - center.x, current.y - center.y));
                const uniform = Math.max(minScale, (distance / startDistance) * startScaleX);
                model.scaleX = uniform;
                model.scaleY = uniform;
            }
        } else if (mode === "vertex") {
            const local = event.data.getLocalPosition(this.shapeMap.get(model.id));
            const vertices = model.params.vertices || [];
            if (vertices[0]) {
                vertices[this.activeDrag.vertexIndex] = { x: local.x, y: local.y };
            }
        }
        this.updateDisplayFromModel(model);
        this.callbacks.onShapeChange(model);
    }

    computeAxisScale(startAxis, currentAxis, startScale, minScale) {
        if (Math.abs(startAxis) < 1) {
            return startScale;
        }
        if (Math.sign(startAxis) !== Math.sign(currentAxis)) {
            return startScale;
        }
        const next = (currentAxis / startAxis) * startScale;
        return Math.max(minScale, next);
    }

    getLocalDelta(point, center, angle) {
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }

    onPointerUp() {
        this.app.stage.off("pointermove", this.onPointerMove, this);
        this.app.stage.off("pointerup", this.onPointerUp, this);
        this.app.stage.off("pointerupoutside", this.onPointerUp, this);
        const selected = this.getSelectedModel();
        if (selected) {
            const display = this.shapeMap.get(selected.id);
            if (display) {
                display.cursor = "move";
            }
        }
        this.activeDrag = null;
    }

    setBackgroundImage(url, cleanup) {
        if (this.backgroundSprite) {
            this.backgroundSprite.destroy();
            this.backgroundSprite = null;
        }
        if (!url) {
            if (cleanup) {
                cleanup();
            }
            return;
        }
        const texture = window.PIXI.Texture.from(url);
        const sprite = new window.PIXI.Sprite(texture);
        sprite.alpha = this.state.background.alpha;
        sprite.anchor.set(0.5);
        sprite.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        sprite.eventMode = "none";
        sprite.scale.set(1);
        if (cleanup) {
            if (texture.baseTexture.valid) {
                cleanup();
            } else {
                texture.baseTexture.once("loaded", () => cleanup());
                texture.baseTexture.once("error", () => cleanup());
            }
        }
        this.backgroundSprite = sprite;
        this.stageRoot.addChildAt(sprite, 0);
    }

    resize(width, height) {
        if (!this.app) {
            return;
        }
        this.app.renderer.resize(width, height);
        this.stageRoot.hitArea = this.app.screen;
        if (this.backgroundSprite) {
            this.backgroundSprite.position.set(width / 2, height / 2);
        }
    }

    refreshAll() {
        this.state.shapes.forEach((model) => this.updateDisplayFromModel(model));
    }

    clearAll() {
        this.shapeMap.forEach((display) => {
            display.destroy({ children: true });
        });
        this.shapeMap.clear();
        this.state.shapes = [];
        this.state.selectedId = null;
        if (this.backgroundSprite) {
            this.backgroundSprite.destroy();
            this.backgroundSprite = null;
        }
        this.gizmo.visible = false;
        this.callbacks.onSelectionChange(null);
        this.callbacks.onShapeListChange(this.state.shapes);
    }
}
