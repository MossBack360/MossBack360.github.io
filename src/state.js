export const state = {
    currentTool: "rectangle",
    toolParams: {
        rectangle: { width: 120, height: 80, chamfer: 0 },
        circle: { radius: 50 },
        polygon: { sides: 5, radius: 60, chamfer: 0 },
        vertices: { chamfer: 0 }
    },
    shapes: [],
    selectedId: null,
    canvas: {
        width: 900,
        height: 520
    },
    background: {
        url: "",
        alpha: 0.6
    }
};
