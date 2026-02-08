export function createRegularPolygonPoints(sides, radius) {
    const points = [];
    const step = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i += 1) {
        const angle = -Math.PI / 2 + step * i;
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    return points;
}

export function clonePoint(point) {
    return { x: point.x, y: point.y };
}

export function applyTransform(point, position, angle, scale) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = point.x * scale;
    const y = point.y * scale;
    return {
        x: position.x + x * cos - y * sin,
        y: position.y + x * sin + y * cos
    };
}
