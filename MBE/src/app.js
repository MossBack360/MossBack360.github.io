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

const testState = {
    hasStatic: false,
    hasDynamic: false
};

let isMatterVisible = true;
let autoStatic = false;
let autoStaticCounter = 0;

const ui = setupUI(state, {
    onToolParamChange() {
        pixiPreview.refreshAll();
    },
    onSelectionParamChange(model) {
        pixiPreview.updateDisplayFromModel(model);
        ui.updateSelection(model);
    },
    onCopySelection() {
        const selected = pixiPreview.getSelectedModel();
        if (!selected) {
            return;
        }
        state.clipboard = {
            type: selected.type,
            params: JSON.parse(JSON.stringify(selected.params || {})),
            angle: selected.angle,
            scaleX: selected.scaleX ?? 1,
            scaleY: selected.scaleY ?? 1
        };
        ui.updatePasteAvailability();
    },
    onNewVerticesShape() {
        state.currentTool = "vertices";
        state.verticesMode.createNew = true;
        ui.updateToolSelection();
    },
    onEditVerticesShape() {
        state.currentTool = "vertices";
        state.verticesMode.createNew = false;
        ui.updateToolSelection();
    },
    canResizeCanvas() {
        return state.shapes.length === 0;
    },
    onCanvasResize(width, height) {
        if (state.shapes.length !== 0) {
            return;
        }
        if (width < 1 || height < 1) {
            window.alert("Canvas size must be at least 1.");
            return;
        }
        const nextWidth = Math.max(1, Math.min(2000, Math.round(width)));
        const nextHeight = Math.max(1, Math.min(2000, Math.round(height)));
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
    onTestStatic() {
        if (testState.hasDynamic) {
            return;
        }
        matterPreview.renderBody(state.shapes);
        testState.hasStatic = true;
        ui.updateTestButtons(testState);
    },
    onTestDynamic() {
        if (testState.hasStatic || autoStatic) {
            return;
        }
        matterPreview.renderDynamicBody(state.shapes);
        testState.hasDynamic = true;
        ui.updateTestButtons(testState);
    },
    onClearBody() {
        matterPreview.clearTestBodies();
        testState.hasStatic = false;
        testState.hasDynamic = false;
        autoStatic = false;
        ui.updateTestButtons(testState);
        ui.updateAutoStatic(false);
    },
    onToggleAutoStatic(enabled) {
        if (testState.hasDynamic) {
            return;
        }
        autoStatic = enabled;
        if (autoStatic) {
            testState.hasStatic = true;
            matterPreview.renderBody(state.shapes);
        }
        ui.updateTestButtons(testState);
    },
    onToggleMatter() {
        isMatterVisible = !isMatterVisible;
        ui.updateMatterVisibility(isMatterVisible);
    },
    onResetProject() {
        const ok = window.confirm("Reset everything? This will clear all shapes, tests, and background.");
        if (!ok) {
            return;
        }
        state.clipboard = null;
        state.verticesMode.createNew = false;
        state.background.url = "";
        pixiPreview.clearAll();
        matterPreview.clearTestBodies();
        matterPreview.setBoundsActive(false);
        testState.hasStatic = false;
        testState.hasDynamic = false;
        autoStatic = false;
        ui.updateTestButtons(testState);
        ui.updatePasteAvailability();
        ui.updateCanvas();
        ui.updateAutoStatic(false);
    },
    onOpenManual() {
        ui.openManual();
    }
});

applyCanvasSize();
ui.updateMatterVisibility(isMatterVisible);

function handleSelectionChange(model) {
    ui.updateSelection(model);
    ui.updatePasteAvailability();
}

function handleShapeChange(model) {
    ui.updateSelection(model);
}

function handleShapeListChange() {
    ui.updateSelection(pixiPreview.getSelectedModel());
    ui.updateCanvas();
    ui.updatePasteAvailability();
    matterPreview.setBoundsActive(state.shapes.length > 0);
}

function tick() {
    if (autoStatic && !testState.hasDynamic) {
        autoStaticCounter += 1;
        if (autoStaticCounter >= 15) {
            autoStaticCounter = 0;
            matterPreview.renderBody(state.shapes);
            testState.hasStatic = true;
            ui.updateTestButtons(testState);
        }
    } else {
        autoStaticCounter = 0;
    }
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);

function applyCanvasSize() {
    const width = state.canvas.width;
    const height = state.canvas.height;
    pixiContainer.style.width = `${width}px`;
    pixiContainer.style.height = `${height}px`;
    matterContainer.style.width = `${width}px`;
    matterContainer.style.height = `${height}px`;
    pixiPreview.resize(width, height);
    matterPreview.resize(width, height);
    matterPreview.setBoundsActive(state.shapes.length > 0);
}
