import { getScaledParams } from "./model.js";

export function setupUI(state, callbacks) {
    const toolButtons = Array.from(document.querySelectorAll(".tool-button"));
    const toolParamsContainer = document.querySelector("#tool-params");
    const selectionParamsContainer = document.querySelector("#selection-params");
    const importButton = document.querySelector("#import-image");
    const imageInput = document.querySelector("#image-input");
    const exportButton = document.querySelector("#export-body");
    const testButton = document.querySelector("#test-body");
    const exportOutput = document.querySelector("#export-output");
    const exportCodeOutput = document.querySelector("#export-code-output");
    const canvasWidthInput = document.querySelector("#canvas-width");
    const canvasHeightInput = document.querySelector("#canvas-height");
    const applyCanvasButton = document.querySelector("#apply-canvas-size");

    toolButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.currentTool = button.dataset.tool;
            updateToolButtons(state, toolButtons);
            renderToolParams(state, toolParamsContainer, callbacks);
        });
    });

    importButton.addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        const url = URL.createObjectURL(file);
        callbacks.onImportImage(url, () => URL.revokeObjectURL(url));
        imageInput.value = "";
    });

    exportButton.addEventListener("click", () => {
        const data = callbacks.onExport();
        exportOutput.value = data.json;
        exportCodeOutput.value = data.code;
    });

    testButton.addEventListener("click", () => callbacks.onTest());

    canvasWidthInput.value = state.canvas.width;
    canvasHeightInput.value = state.canvas.height;
    applyCanvasButton.addEventListener("click", () => {
        const width = Number(canvasWidthInput.value);
        const height = Number(canvasHeightInput.value);
        callbacks.onCanvasResize(width, height);
    });

    updateToolButtons(state, toolButtons);
    renderToolParams(state, toolParamsContainer, callbacks);
    renderSelectionParams(state, selectionParamsContainer, null, callbacks);
    updateCanvasControls(state, callbacks, canvasWidthInput, canvasHeightInput, applyCanvasButton);

    return {
        updateSelection(model) {
            renderSelectionParams(state, selectionParamsContainer, model, callbacks);
        },
        updateCanvas() {
            updateCanvasControls(state, callbacks, canvasWidthInput, canvasHeightInput, applyCanvasButton);
        },
        updateExport(text) {
            exportOutput.value = text;
        },
        updateExportCode(text) {
            exportCodeOutput.value = text;
        }
    };
}

function updateToolButtons(state, buttons) {
    buttons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tool === state.currentTool);
    });
}

function renderToolParams(state, container, callbacks) {
    container.innerHTML = "";
    const tool = state.currentTool;
    const params = state.toolParams[tool];
    if (tool === "rectangle") {
        container.appendChild(
            createNumberRow("Width", params.width, 10, 600, (value) => {
                params.width = value;
                callbacks.onToolParamChange();
            })
        );
        container.appendChild(
            createNumberRow("Height", params.height, 10, 600, (value) => {
                params.height = value;
                callbacks.onToolParamChange();
            })
        );
        container.appendChild(
            createRangeRow("Chamfer", params.chamfer ?? 0, 0, 80, 1, (value) => {
                params.chamfer = value;
                callbacks.onToolParamChange();
            })
        );
    } else if (tool === "circle") {
        container.appendChild(
            createNumberRow("Radius", params.radius, 5, 300, (value) => {
                params.radius = value;
                callbacks.onToolParamChange();
            })
        );
    } else if (tool === "polygon") {
        container.appendChild(
            createNumberRow("Sides", params.sides, 3, 12, (value) => {
                params.sides = value;
                callbacks.onToolParamChange();
            })
        );
        container.appendChild(
            createNumberRow("Radius", params.radius, 10, 300, (value) => {
                params.radius = value;
                callbacks.onToolParamChange();
            })
        );
        container.appendChild(
            createRangeRow("Chamfer", params.chamfer ?? 0, 0, 80, 1, (value) => {
                params.chamfer = value;
                callbacks.onToolParamChange();
            })
        );
    } else if (tool === "vertices") {
        const hint = document.createElement("div");
        hint.textContent = "Click to add points. Ctrl-drag a point to move.";
        container.appendChild(hint);
        container.appendChild(
            createRangeRow("Chamfer", params.chamfer ?? 0, 0, 80, 1, (value) => {
                params.chamfer = value;
                callbacks.onToolParamChange();
            })
        );
    }
}

function renderSelectionParams(state, container, modelOverride, callbacks) {
    container.innerHTML = "";
    const model = modelOverride || state.shapes.find((shape) => shape.id === state.selectedId);
    if (!model) {
        const empty = document.createElement("div");
        empty.textContent = "No selection";
        container.appendChild(empty);
        return;
    }

    const params = getScaledParams(model);
    container.appendChild(createReadonlyRow("Type", model.type));
    container.appendChild(
        createNumberRow("X", model.position.x, -9999, 9999, (value) => {
            model.position.x = value;
            callbacks.onSelectionParamChange(model);
        })
    );
    container.appendChild(
        createNumberRow("Y", model.position.y, -9999, 9999, (value) => {
            model.position.y = value;
            callbacks.onSelectionParamChange(model);
        })
    );
    if (model.type !== "circle") {
        container.appendChild(
            createNumberRow("Angle", (model.angle * (180 / Math.PI)), -180, 180, (value) => {
                model.angle = (value * Math.PI) / 180;
                callbacks.onSelectionParamChange(model);
            })
        );
    } else {
        container.appendChild(createReadonlyRow("Angle", "Disabled"));
    }
    container.appendChild(
        createNumberRow("Scale X", model.scaleX ?? 1, 0.1, 10, (value) => {
            model.scaleX = value;
            callbacks.onSelectionParamChange(model);
        })
    );
    container.appendChild(
        createNumberRow("Scale Y", model.scaleY ?? 1, 0.1, 10, (value) => {
            model.scaleY = value;
            callbacks.onSelectionParamChange(model);
        })
    );

    if (model.type === "rectangle") {
        container.appendChild(
            createNumberRow("Width", model.params.width, 5, 1000, (value) => {
                model.params.width = value;
                callbacks.onSelectionParamChange(model);
            })
        );
        container.appendChild(
            createNumberRow("Height", model.params.height, 5, 1000, (value) => {
                model.params.height = value;
                callbacks.onSelectionParamChange(model);
            })
        );
        container.appendChild(renderChamferSection(model, callbacks, 4));
    } else if (model.type === "circle") {
        container.appendChild(
            createNumberRow("Radius", model.params.radius, 2, 600, (value) => {
                model.params.radius = value;
                callbacks.onSelectionParamChange(model);
            })
        );
        container.appendChild(createReadonlyRow("Radius X", params.radiusX.toFixed(1)));
        container.appendChild(createReadonlyRow("Radius Y", params.radiusY.toFixed(1)));
    } else if (model.type === "polygon") {
        container.appendChild(
            createNumberRow("Sides", model.params.sides, 3, 12, (value) => {
                model.params.sides = Math.max(3, Math.round(value));
                callbacks.onSelectionParamChange(model);
            })
        );
        container.appendChild(
            createNumberRow("Radius", model.params.radius, 5, 600, (value) => {
                model.params.radius = value;
                callbacks.onSelectionParamChange(model);
            })
        );
        container.appendChild(renderChamferSection(model, callbacks, model.params.sides));
    } else if (model.type === "vertices") {
        container.appendChild(createReadonlyRow("Points", params.vertices.length));
        container.appendChild(renderChamferSection(model, callbacks, params.vertices.length));
    }
}

function createNumberRow(label, value, min, max, onChange) {
    const row = document.createElement("div");
    row.className = "param-row";
    const text = document.createElement("label");
    text.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.value = value;
    input.min = min;
    input.max = max;
    input.step = "0.1";
    input.addEventListener("change", () => onChange(Number(input.value)));
    row.appendChild(text);
    row.appendChild(input);
    return row;
}

function createRangeRow(label, value, min, max, step, onChange) {
    const row = document.createElement("div");
    row.className = "param-row param-row-range";
    const text = document.createElement("label");
    text.textContent = label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = min;
    range.max = max;
    range.step = step;
    range.value = value;
    const number = document.createElement("input");
    number.type = "number";
    number.min = min;
    number.max = max;
    number.step = step;
    number.value = value;
    range.addEventListener("input", () => {
        number.value = range.value;
        onChange(Number(range.value));
    });
    number.addEventListener("change", () => {
        range.value = number.value;
        onChange(Number(number.value));
    });
    row.appendChild(text);
    row.appendChild(range);
    row.appendChild(number);
    return row;
}

function renderChamferSection(model, callbacks, count) {
    const wrapper = document.createElement("div");
    const note = document.createElement("div");
    note.textContent = "Note: Only rectangles preview chamfer in Pixi.";
    wrapper.appendChild(note);

    const globalRow = createRangeRowStaged(
        "Chamfer",
        model.params.chamfer ?? 0,
        0,
        80,
        1
    );
    wrapper.appendChild(globalRow.row);
    const applyGlobal = document.createElement("button");
    applyGlobal.textContent = "Apply";
    applyGlobal.addEventListener("click", () => {
        const value = globalRow.getValue();
        model.params.chamfer = value;
        model.params.vertexChamfers = syncVertexChamfers(count, value);
        model.params.usePerVertex = false;
        callbacks.onSelectionParamChange(model);
    });
    wrapper.appendChild(applyGlobal);

    const advanced = document.createElement("div");
    advanced.className = "advanced-panel";
    const advancedTitle = document.createElement("div");
    advancedTitle.textContent = "Advanced Vertex Chamfer";
    advanced.appendChild(advancedTitle);

    const chamfers = ensureVertexChamfers(model, count);
    const staged = [];
    for (let i = 0; i < count; i += 1) {
        const row = createRangeRowStaged(`V${i + 1}`, chamfers[i] ?? 0, 0, 80, 1);
        staged.push(row);
        advanced.appendChild(row.row);
    }
    const applyAdvanced = document.createElement("button");
    applyAdvanced.textContent = "Apply";
    applyAdvanced.addEventListener("click", () => {
        model.params.vertexChamfers = staged.map((row) => row.getValue());
        model.params.usePerVertex = true;
        callbacks.onSelectionParamChange(model);
    });
    advanced.appendChild(applyAdvanced);
    wrapper.appendChild(advanced);
    return wrapper;
}

function createRangeRowStaged(label, value, min, max, step) {
    const row = document.createElement("div");
    row.className = "param-row param-row-range";
    const text = document.createElement("label");
    text.textContent = label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = min;
    range.max = max;
    range.step = step;
    range.value = value;
    const number = document.createElement("input");
    number.type = "number";
    number.min = min;
    number.max = max;
    number.step = step;
    number.value = value;
    range.addEventListener("input", () => {
        number.value = range.value;
    });
    number.addEventListener("change", () => {
        range.value = number.value;
    });
    row.appendChild(text);
    row.appendChild(range);
    row.appendChild(number);
    return {
        row,
        getValue() {
            return Number(number.value);
        }
    };
}

function ensureVertexChamfers(model, count) {
    if (!Array.isArray(model.params.vertexChamfers) || model.params.vertexChamfers.length !== count) {
        model.params.vertexChamfers = syncVertexChamfers(count, model.params.chamfer || 0);
    }
    return model.params.vertexChamfers;
}

function syncVertexChamfers(count, value) {
    return Array.from({ length: count }, () => value);
}

function updateCanvasControls(state, callbacks, widthInput, heightInput, applyButton) {
    const canResize = callbacks.canResizeCanvas();
    widthInput.disabled = !canResize;
    heightInput.disabled = !canResize;
    applyButton.disabled = !canResize;
    widthInput.value = state.canvas.width;
    heightInput.value = state.canvas.height;
}

function createReadonlyRow(label, value) {
    const row = document.createElement("div");
    row.className = "param-row";
    const text = document.createElement("label");
    text.textContent = label;
    const output = document.createElement("div");
    output.textContent = value;
    row.appendChild(text);
    row.appendChild(output);
    return row;
}
