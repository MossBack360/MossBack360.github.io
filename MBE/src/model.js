let nextId = 1;

export function createShapeModel(type, params, position) {
    return {
        id: `shape_${nextId++}`,
        type,
        position: { x: position.x, y: position.y },
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        renderColor: pickColor(),
        params: JSON.parse(JSON.stringify(params))
    };
}

export function cloneShapeModel(template, position) {
    return {
        id: `shape_${nextId++}`,
        type: template.type,
        position: { x: position.x, y: position.y },
        angle: template.angle || 0,
        scaleX: template.scaleX ?? 1,
        scaleY: template.scaleY ?? 1,
        renderColor: template.renderColor || pickColor(),
        params: JSON.parse(JSON.stringify(template.params || {}))
    };
}

function pickColor() {
    const palette = ["#7aa6e5", "#7fd1b9", "#f2b45a", "#d68fb5", "#8ac0d1", "#c4d35a"];
    return palette[Math.floor(Math.random() * palette.length)];
}

export function updateShapeModel(model, patch) {
    Object.assign(model, patch);
}

export function getScaledParams(model) {
    const scaleX = model.scaleX ?? 1;
    const scaleY = model.scaleY ?? 1;
    if (model.type === "rectangle") {
        return {
            width: model.params.width * scaleX,
            height: model.params.height * scaleY
        };
    }
    if (model.type === "circle") {
        return {
            radius: model.params.radius,
            radiusX: model.params.radius * scaleX,
            radiusY: model.params.radius * scaleY
        };
    }
    if (model.type === "polygon") {
        return {
            sides: model.params.sides,
            radius: model.params.radius,
            radiusX: model.params.radius * scaleX,
            radiusY: model.params.radius * scaleY
        };
    }
    if (model.type === "vertices") {
        return {
            vertices: model.params.vertices || []
        };
    }
    return {};
}
