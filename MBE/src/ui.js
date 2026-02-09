import { getScaledParams } from "./model.js";

export function setupUI(state, callbacks) {
    const toolButtons = Array.from(document.querySelectorAll(".tool-button"));
    const toolParamsContainer = document.querySelector("#tool-params");
    const selectionParamsContainer = document.querySelector("#selection-params");
    const importButton = document.querySelector("#import-image");
    const imageInput = document.querySelector("#image-input");
    const exportButton = document.querySelector("#export-body");
    const testStaticButton = document.querySelector("#test-body-static");
    const testDynamicButton = document.querySelector("#test-body-dynamic");
    const clearBodyButton = document.querySelector("#clear-body");
    const autoStaticInput = document.querySelector("#auto-static");
    const exportOutput = document.querySelector("#export-output");
    const exportCodeOutput = document.querySelector("#export-code-output");
    const canvasWidthInput = document.querySelector("#canvas-width");
    const canvasHeightInput = document.querySelector("#canvas-height");
    const applyCanvasButton = document.querySelector("#apply-canvas-size");
    const pasteToolButton = document.querySelector("#paste-tool");
    const newVerticesButton = document.querySelector("#new-vertices-shape");
    const editVerticesButton = document.querySelector("#edit-vertices-shape");
    const toggleMatterButton = document.querySelector("#toggle-matter");
    const resetButton = document.querySelector("#reset-project");
    const manualButton = document.querySelector("#open-manual");
    const manualDialog = document.querySelector("#manual-dialog");
    const manualClose = document.querySelector("#close-manual");
    const previewBody = document.querySelector(".preview-body");
    const matterFieldset = document.querySelector("#matter-fieldset");

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

    testStaticButton.addEventListener("click", () => callbacks.onTestStatic());
    testDynamicButton.addEventListener("click", () => callbacks.onTestDynamic());
    clearBodyButton.addEventListener("click", () => callbacks.onClearBody());
    autoStaticInput.addEventListener("change", () => {
        callbacks.onToggleAutoStatic(autoStaticInput.checked);
    });
    newVerticesButton.addEventListener("click", () => callbacks.onNewVerticesShape());
    editVerticesButton.addEventListener("click", () => callbacks.onEditVerticesShape());
    toggleMatterButton.addEventListener("click", () => callbacks.onToggleMatter());
    resetButton.addEventListener("click", () => callbacks.onResetProject());
    manualButton.addEventListener("click", () => callbacks.onOpenManual());
    if (manualClose) {
        manualClose.addEventListener("click", () => {
            manualDialog.close();
        });
    }

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
    updatePasteAvailability(state, pasteToolButton);
    updateTestButtons({ hasStatic: false, hasDynamic: false }, testStaticButton, testDynamicButton, clearBodyButton, autoStaticInput);

    return {
        updateSelection(model) {
            renderSelectionParams(state, selectionParamsContainer, model, callbacks);
        },
        updateCanvas() {
            updateCanvasControls(state, callbacks, canvasWidthInput, canvasHeightInput, applyCanvasButton);
        },
        updateToolSelection() {
            updateToolButtons(state, toolButtons);
        },
        updateExport(text) {
            exportOutput.value = text;
        },
        updateExportCode(text) {
            exportCodeOutput.value = text;
        },
        updatePasteAvailability() {
            updatePasteAvailability(state, pasteToolButton);
        },
        updateTestButtons(testState) {
            updateTestButtons(testState, testStaticButton, testDynamicButton, clearBodyButton, autoStaticInput);
        },
        updateAutoStatic(enabled) {
            autoStaticInput.checked = enabled;
        },
        updateMatterVisibility(isVisible) {
            if (isVisible) {
                matterFieldset.style.display = "";
                previewBody.classList.remove("matter-hidden");
                toggleMatterButton.textContent = "Hide Matter Preview";
            } else {
                matterFieldset.style.display = "none";
                previewBody.classList.add("matter-hidden");
                toggleMatterButton.textContent = "Show Matter Preview";
            }
        },
        openManual() {
            if (manualDialog && manualDialog.showModal) {
                manualDialog.showModal();
            } else {
                window.alert("Manual:\n1. Select a shape tool and click inside the Pixi preview to create a shape.\n2. Drag to move. Use the rotation handle to rotate. Use the scale handle to resize (hold Shift for free scaling).\n3. Vertices: click to add points. Hold Ctrl to drag a single point.\n4. Use Test Body buttons to preview in Matter. Clear Body resets test bodies.\n5. Export generates JSON and code for copy & paste.");
            }
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
    const copyRow = document.createElement("div");
    copyRow.className = "param-row";
    const copyLabel = document.createElement("label");
    copyLabel.textContent = "Copy";
    const copyButton = document.createElement("button");
    copyButton.id = "copy-selection";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => callbacks.onCopySelection());
    copyRow.appendChild(copyLabel);
    copyRow.appendChild(copyButton);
    container.appendChild(copyRow);
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
    note.textContent = "Note: Only rectangles preview chamfer in Pixi. Pixi does not render chamfer for other shapes.";
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

function updatePasteAvailability(state, pasteButton) {
    pasteButton.disabled = !state.clipboard;
}

function updateTestButtons(testState, staticButton, dynamicButton, clearButton, autoStaticInput) {
    staticButton.disabled = testState.hasDynamic;
    dynamicButton.disabled = testState.hasStatic || autoStaticInput.checked;
    autoStaticInput.disabled = testState.hasDynamic;
    clearButton.disabled = !testState.hasStatic && !testState.hasDynamic && !autoStaticInput.checked;
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
