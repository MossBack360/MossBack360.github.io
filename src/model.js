let nextId = 1;

export function createShapeModel(type, params, position) {
    return {
        id: `shape_${nextId++}`,
        type,
        position: { x: position.x, y: position.y },
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        params: JSON.parse(JSON.stringify(params))
    };
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
