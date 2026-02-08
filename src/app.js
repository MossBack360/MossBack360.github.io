import { state } from "./state.js";
import { PixiPreview } from "./pixi-preview.js";
import { MatterPreview } from "./matter-preview.js";
import { setupUI } from "./ui.js";
import { exportBodyData, exportBodyCode } from "./exporter.js";

const pixiContainer = document.querySelector("#pixi-container");
const matterContainer = document.querySelector("#matter-container");

const pixiPreview = new PixiPreview(pixiContainer, state, {
    onSelectionChange: handleSelectionChange,
    onShapeChange: handleShapeChange,
    onShapeListChange: handleShapeListChange
});
pixiPreview.init();

const matterPreview = new MatterPreview(matterContainer);

const ui = setupUI(state, {
    onToolParamChange() {
        pixiPreview.refreshAll();
    },
    onSelectionParamChange(model) {
        pixiPreview.updateDisplayFromModel(model);
        ui.updateSelection(model);
    },
    canResizeCanvas() {
        return state.shapes.length === 0;
    },
    onCanvasResize(width, height) {
        if (state.shapes.length !== 0) {
            return;
        }
        const nextWidth = Math.max(200, Math.min(2000, Math.round(width)));
        const nextHeight = Math.max(200, Math.min(2000, Math.round(height)));
        state.canvas.width = nextWidth;
        state.canvas.height = nextHeight;
        applyCanvasSize();
        ui.updateCanvas();
    },
    onImportImage(url, cleanup) {
        state.background.url = url;
        pixiPreview.setBackgroundImage(url, cleanup);
    },
    onExport() {
        return {
            json: exportBodyData(state.shapes),
            code: exportBodyCode(state.shapes)
        };
    },
    onTest() {
        matterPreview.renderBody(state.shapes);
    }
});

applyCanvasSize();

function handleSelectionChange(model) {
    ui.updateSelection(model);
}

function handleShapeChange(model) {
    ui.updateSelection(model);
}

function handleShapeListChange() {
    ui.updateSelection(pixiPreview.getSelectedModel());
    ui.updateCanvas();
}

function applyCanvasSize() {
    const width = state.canvas.width;
    const height = state.canvas.height;
    pixiContainer.style.width = `${width}px`;
    pixiContainer.style.height = `${height}px`;
    matterContainer.style.width = `${width}px`;
    matterContainer.style.height = `${height}px`;
    pixiPreview.resize(width, height);
    matterPreview.resize(width, height);
}
