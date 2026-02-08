import { getScaledParams } from "./model.js";

export function exportBodyData(models) {
    const parts = models.map((model) => {
        const params = getScaledParams(model);
        return {
            id: model.id,
            type: model.type,
            position: { x: round(model.position.x), y: round(model.position.y) },
            angle: round(model.angle),
            scaleX: round(model.scaleX ?? 1),
            scaleY: round(model.scaleY ?? 1),
            params: normalizeParams(model.type, params, model)
        };
    });

    const payload = {
        version: "1.0",
        parts
    };

    return JSON.stringify(payload, null, 2);
}

export function exportBodyCode(models) {
    const lines = ["const { Bodies, Body, Vertices } = Matter;"];
    const parts = [];
    let partIndex = 1;

    models.forEach((model) => {
        const params = getScaledParams(model);
        const scaleX = model.scaleX ?? 1;
        const scaleY = model.scaleY ?? 1;
        const angle = round(model.angle);
        const posX = round(model.position.x);
        const posY = round(model.position.y);

        const chamfer = Math.max(0, model.params.chamfer || 0);
        const usePerVertex = model.params.usePerVertex && Array.isArray(model.params.vertexChamfers);
        const chamferRadius = usePerVertex
            ? `[${model.params.vertexChamfers.map((value) => round(value)).join(", ")}]`
            : chamfer
                ? `${round(chamfer)}`
                : null;
        const chamferText = chamferRadius
            ? `, { chamfer: { radius: ${chamferRadius} }, angle: ${angle} }`
            : `, { angle: ${angle} }`;

        if (model.type === "rectangle") {
            const width = round(params.width);
            const height = round(params.height);
            parts.push(`Bodies.rectangle(${posX}, ${posY}, ${width}, ${height}${chamferText})`);
            return;
        }

        if (model.type === "circle") {
            if (Math.abs(scaleX - scaleY) < 0.0001) {
                const radius = round(params.radiusX);
                parts.push(`Bodies.circle(${posX}, ${posY}, ${radius}, { angle: ${angle} })`);
            } else {
                const baseRadius = round(model.params.radius);
                const partName = `part${partIndex++}`;
                lines.push(`const ${partName} = Bodies.circle(${posX}, ${posY}, ${baseRadius}, { angle: ${angle} });`);
                lines.push(`Body.scale(${partName}, ${round(scaleX)}, ${round(scaleY)});`);
                parts.push(partName);
            }
            return;
        }

        if (model.type === "polygon") {
            if (Math.abs(scaleX - scaleY) < 0.0001) {
                const radius = round(params.radiusX);
                parts.push(
                    `Bodies.polygon(${posX}, ${posY}, ${params.sides}, ${radius}${chamferText})`
                );
            } else {
                const baseRadius = round(model.params.radius);
                const partName = `part${partIndex++}`;
                lines.push(
                    `const ${partName} = Bodies.polygon(${posX}, ${posY}, ${params.sides}, ${baseRadius}${chamferText});`
                );
                lines.push(`Body.scale(${partName}, ${round(scaleX)}, ${round(scaleY)});`);
                parts.push(partName);
            }
            return;
        }

        if (model.type === "vertices") {
            const verts = (model.params.vertices || []).map((v) => `  { x: ${round(v.x)}, y: ${round(v.y)} }`);
            const partName = `part${partIndex++}`;
            const usePerVertex = model.params.usePerVertex && Array.isArray(model.params.vertexChamfers);
            if (usePerVertex && model.params.vertexChamfers.length === (model.params.vertices || []).length) {
                const chamfers = model.params.vertexChamfers.map((value) => round(value));
                lines.push(`const ${partName}Verts = [`);
                lines.push(verts.join(",\n"));
                lines.push("];");
                lines.push(`const ${partName}Chamfer = Vertices.chamfer(${partName}Verts, [${chamfers.join(", ")}]);`);
                lines.push(`const ${partName} = Bodies.fromVertices(${posX}, ${posY}, [${partName}Chamfer], { angle: ${angle} });`);
            } else if (chamfer) {
                lines.push(`const ${partName}Verts = [`);
                lines.push(verts.join(",\n"));
                lines.push("];");
                lines.push(`const ${partName}Chamfer = Vertices.chamfer(${partName}Verts, ${round(chamfer)});`);
                lines.push(`const ${partName} = Bodies.fromVertices(${posX}, ${posY}, [${partName}Chamfer], { angle: ${angle} });`);
            } else {
                lines.push(`const ${partName} = Bodies.fromVertices(${posX}, ${posY}, [`);
                lines.push(verts.join(",\n"));
                lines.push(`], { angle: ${angle} });`);
            }
            if (Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001) {
                lines.push(`Body.scale(${partName}, ${round(scaleX)}, ${round(scaleY)});`);
            }
            parts.push(partName);
            return;
        }
    });

    lines.push("const compound = Body.create({");
    lines.push("  parts: [");
    parts.forEach((part, index) => {
        const suffix = index === parts.length - 1 ? "" : ",";
        lines.push(`    ${part}${suffix}`);
    });
    lines.push("  ]");
    lines.push("});");

    return lines.join("\n");
}

function normalizeParams(type, params, model) {
    if (type === "rectangle") {
        return {
            width: round(params.width),
            height: round(params.height),
            chamfer: round(model.params.chamfer || 0),
            vertexChamfers: (model.params.vertexChamfers || []).map((value) => round(value)),
            usePerVertex: Boolean(model.params.usePerVertex)
        };
    }
    if (type === "circle") {
        return {
            radiusX: round(params.radiusX),
            radiusY: round(params.radiusY)
        };
    }
    if (type === "polygon") {
        return {
            sides: params.sides,
            radiusX: round(params.radiusX),
            radiusY: round(params.radiusY),
            chamfer: round(model.params.chamfer || 0),
            vertexChamfers: (model.params.vertexChamfers || []).map((value) => round(value)),
            usePerVertex: Boolean(model.params.usePerVertex)
        };
    }
    if (type === "vertices") {
        return {
            vertices: (model.params.vertices || []).map((vertex) => ({
                x: round(vertex.x),
                y: round(vertex.y)
            })),
            chamfer: round(model.params.chamfer || 0),
            vertexChamfers: (model.params.vertexChamfers || []).map((value) => round(value)),
            usePerVertex: Boolean(model.params.usePerVertex)
        };
    }
    return params;
}

function round(value) {
    return Math.round(value * 1000) / 1000;
}
