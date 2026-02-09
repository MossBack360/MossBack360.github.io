import { getScaledParams } from "./model.js";

export class MatterPreview {
    constructor(container) {
        this.container = container;
        this.engine = null;
        this.render = null;
        this.runner = null;
        this.bounds = { width: 600, height: 300 };
        this.boundaryBodies = [];
        this.testBodies = [];
    }

    init() {
        const Matter = window.Matter;
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 300;

        this.engine = Matter.Engine.create();
        this.engine.gravity.y = 0;

        this.render = Matter.Render.create({
            element: this.container,
            engine: this.engine,
            options: {
                width,
                height,
                wireframes: false,
                background: "#ffffff"
            }
        });
        Matter.Render.run(this.render);
        this.runner = Matter.Runner.create();
        Matter.Runner.run(this.runner, this.engine);
        this.bounds = { width, height };
    }

    clear() {
        const Matter = window.Matter;
        Matter.World.clear(this.engine.world, false);
        Matter.Engine.clear(this.engine);
    }

    renderBody(models) {
        this.clearTestBodies();
        if (!this.engine) {
            this.init();
        }
        this.engine.gravity.y = 0;
        const Matter = window.Matter;
        const parts = models.map((model) => this.createBodyPart(model));
        const compound = Matter.Body.create({ parts });

        const centerOffset = this.getAveragePosition(models);
        if (centerOffset) {
            Matter.Body.translate(compound, {
                x: this.bounds.width / 2 - centerOffset.x,
                y: this.bounds.height / 2 - centerOffset.y
            });
        }

        Matter.World.add(this.engine.world, compound);
        this.testBodies = [compound];
    }

    createBodyPart(model) {
        const Matter = window.Matter;
        const params = getScaledParams(model);
        const scaleX = model.scaleX ?? 1;
        const scaleY = model.scaleY ?? 1;
        let body;
        const render = { fillStyle: model.renderColor || "#7aa6e5", strokeStyle: model.renderColor || "#7aa6e5", lineWidth: 1 };
        if (model.type === "rectangle") {
            body = Matter.Bodies.rectangle(
                model.position.x,
                model.position.y,
                model.params.width,
                model.params.height,
                { angle: model.angle, chamfer: chamferOption(model), render }
            );
        } else if (model.type === "circle") {
            body = Matter.Bodies.circle(
                model.position.x,
                model.position.y,
                model.params.radius,
                { angle: model.angle, render }
            );
        } else if (model.type === "polygon") {
            body = Matter.Bodies.polygon(
                model.position.x,
                model.position.y,
                params.sides,
                model.params.radius,
                { angle: model.angle, chamfer: chamferOption(model), render }
            );
        } else if (model.type === "vertices") {
            const vertices = model.params.vertices || [];
            if (vertices.length < 3) {
                body = Matter.Bodies.circle(model.position.x, model.position.y, 6, { render });
            } else {
                const verts = applyVertexChamfer(vertices, model);
                body = Matter.Bodies.fromVertices(
                    model.position.x,
                    model.position.y,
                    [verts],
                    { angle: model.angle, render }
                );
            }
        } else {
            body = Matter.Bodies.circle(0, 0, 10);
        }
        Matter.Body.scale(body, scaleX, scaleY);
        return body;
    }

    renderDynamicBody(models) {
        if (!this.engine) {
            this.init();
        }
        this.engine.gravity.y = 1;
        const Matter = window.Matter;
        const parts = models.map((model) => this.createBodyPart(model));
        const compound = Matter.Body.create({ parts });
        const centerOffset = this.getAveragePosition(models);
        if (centerOffset) {
            Matter.Body.translate(compound, {
                x: this.bounds.width / 2 - centerOffset.x,
                y: this.bounds.height / 2 - centerOffset.y
            });
        }
        Matter.World.add(this.engine.world, compound);
        this.testBodies.push(compound);
    }

    clearTestBodies() {
        if (!this.engine) {
            return;
        }
        const Matter = window.Matter;
        this.testBodies.forEach((body) => {
            Matter.World.remove(this.engine.world, body);
        });
        this.testBodies = [];
    }

    setBoundsActive(active) {
        if (!this.engine) {
            this.init();
        }
        if (!active) {
            this.removeBounds();
            return;
        }
        this.createBounds();
    }

    createBounds() {
        this.removeBounds();
        const Matter = window.Matter;
        const thickness = 16;
        const width = this.bounds.width;
        const height = this.bounds.height;
        const options = { isStatic: true, render: { fillStyle: "#ffffff", strokeStyle: "#ffffff", lineWidth: 0 } };
        const ground = Matter.Bodies.rectangle(width / 2, height - thickness / 2, width, thickness, options);
        const ceiling = Matter.Bodies.rectangle(width / 2, thickness / 2, width, thickness, options);
        const left = Matter.Bodies.rectangle(thickness / 2, height / 2, thickness, height, options);
        const right = Matter.Bodies.rectangle(width - thickness / 2, height / 2, thickness, height, options);
        this.boundaryBodies = [ground, ceiling, left, right];
        Matter.World.add(this.engine.world, this.boundaryBodies);
    }

    removeBounds() {
        if (!this.engine) {
            return;
        }
        const Matter = window.Matter;
        this.boundaryBodies.forEach((body) => {
            Matter.World.remove(this.engine.world, body);
        });
        this.boundaryBodies = [];
    }

    resize(width, height) {
        this.bounds = { width, height };
        if (!this.render) {
            return;
        }
        if (this.render.canvas) {
            this.render.canvas.width = width;
            this.render.canvas.height = height;
        }
        this.render.options.width = width;
        this.render.options.height = height;
        window.Matter.Render.setSize(this.render, width, height);
        if (this.render.canvas) {
            this.render.canvas.style.width = `${width}px`;
            this.render.canvas.style.height = `${height}px`;
        }
    }

    getAveragePosition(models) {
        if (!models.length) {
            return null;
        }
        const total = models.reduce(
            (acc, model) => {
                acc.x += model.position.x;
                acc.y += model.position.y;
                return acc;
            },
            { x: 0, y: 0 }
        );
        return { x: total.x / models.length, y: total.y / models.length };
    }
}

function chamferOption(model) {
    const value = Math.max(0, model.params.chamfer || 0);
    const perVertex = model.params.usePerVertex && Array.isArray(model.params.vertexChamfers);
    if (perVertex && model.params.vertexChamfers.length) {
        return { radius: model.params.vertexChamfers };
    }
    if (!value) {
        return undefined;
    }
    return { radius: value };
}

function applyVertexChamfer(vertices, model) {
    const Matter = window.Matter;
    const value = Math.max(0, model.params.chamfer || 0);
    const cloned = vertices.map((point) => ({ x: point.x, y: point.y }));
    const perVertex = model.params.usePerVertex && Array.isArray(model.params.vertexChamfers);
    if (perVertex && model.params.vertexChamfers.length === vertices.length) {
        return Matter.Vertices.chamfer(cloned, model.params.vertexChamfers);
    }
    if (value > 0) {
        return Matter.Vertices.chamfer(cloned, value);
    }
    return cloned;
}
