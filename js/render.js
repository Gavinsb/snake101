const Render = {
    ctx: null,
    canvas: null,
    CELL_SIZE: 20,
    CANVAS_SIZE: 400,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.rebuildCanvas();
        Events.on('settings:changed', (s) => {
            if (s.gridSize !== this._lastGridSize) this.rebuildCanvas();
        });
    },

    rebuildCanvas() {
        const gridSize = Settings.get('gridSize');
        this.CELL_SIZE = Math.floor(this.CANVAS_SIZE / gridSize);
        this._lastGridSize = gridSize;
        this.canvas.width = this.CELL_SIZE * gridSize;
        this.canvas.height = this.CELL_SIZE * gridSize;
    },

    _lerp(a, b, t) {
        return a + (b - a) * t;
    },

    render(state) {
        const ctx = this.ctx;
        const { snake, snakePrev, direction, alpha, gameOver } = state;

        ctx.fillStyle = this._bgColor();
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this._drawGrid();
        this._drawWalls(state.walls);
        this._drawFood(state.food, state.foodType);
        this._drawPowerupSpawn();
        this._drawSnake(snake, snakePrev, direction, alpha, gameOver);
    },

    _bgColor() {
        return this._cssVar('--bg-dark', '#1a1a2e');
    },

    _gridColor() {
        return this._cssVar('--grid-line', '#2a2a4a');
    },

    _wallColor() {
        return this._cssVar('--border', '#3a3a5a');
    },

    _cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    },

    _drawGrid() {
        const gridSize = Settings.get('gridSize');
        const ctx = this.ctx;
        ctx.strokeStyle = this._gridColor();
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 1; i < gridSize; i++) {
            const pos = i * this.CELL_SIZE;
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, this.canvas.height);
            ctx.moveTo(0, pos);
            ctx.lineTo(this.canvas.width, pos);
        }
        ctx.stroke();
    },

    _drawWalls(walls) {
        if (!walls || walls.length === 0) return;
        const ctx = this.ctx;
        ctx.fillStyle = this._wallColor();
        walls.forEach(w => {
            this._roundRect(
                ctx,
                w.x * this.CELL_SIZE + 1,
                w.y * this.CELL_SIZE + 1,
                this.CELL_SIZE - 2,
                this.CELL_SIZE - 2,
                3
            );
            ctx.fill();
        });
    },

    _drawFood(food, foodType) {
        if (!food) return;
        const info = Food.getTypeInfo(foodType);
        const ctx = this.ctx;
        const cs = this.CELL_SIZE;
        const centerX = food.x * cs + cs / 2;
        const centerY = food.y * cs + cs / 2;
        const baseRadius = cs / 2 - 2;
        const time = performance.now() / 200;
        const pulse = Math.sin(time) * 2;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, baseRadius + pulse
        );
        gradient.addColorStop(0, info.color);
        gradient.addColorStop(1, info.glowColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = info.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (info.icon) {
            ctx.fillStyle = '#1a1a2e';
            ctx.font = `bold ${Math.floor(cs * 0.5)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.icon, centerX, centerY + 1);
        }
    },

    _drawPowerupSpawn() {
        const spawn = Powerups.getSpawnInfo();
        if (!spawn) return;
        const info = Powerups.getInfo(spawn.type);
        if (!info) return;

        const ctx = this.ctx;
        const cs = this.CELL_SIZE;
        const cx = spawn.x * cs + cs / 2;
        const cy = spawn.y * cs + cs / 2;
        const time = performance.now() / 150;
        const pulse = Math.sin(time) * 3;
        const r = cs / 2 - 2;

        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = info.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = info.color;
        ctx.font = `bold ${Math.floor(cs * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.icon, cx, cy + 1);
    },

    _drawSnake(snake, snakePrev, direction, alpha, gameOver) {
        if (!snake || snake.length === 0) return;
        const ctx = this.ctx;
        const cs = this.CELL_SIZE;
        const gridSize = Settings.get('gridSize');

        snake.forEach((segment, index) => {
            let x = segment.x;
            let y = segment.y;

            if (snakePrev && index < snakePrev.length && !gameOver) {
                const prev = snakePrev[index];
                x = this._lerp(prev.x, x, alpha);
                y = this._lerp(prev.y, y, alpha);
            }

            const px = x * cs;
            const py = y * cs;
            const padding = 1;
            const size = cs - padding * 2;
            const radius = 4;

            const progress = index / Math.max(1, snake.length - 1);
            const r = 0;
            const g = Math.round(255 - (255 - 153) * progress);
            const b = Math.round(136 - (136 - 85) * progress);
            const color = gameOver ? `rgb(${Math.round(255 - 100 * progress)}, ${Math.round(80 * (1 - progress))}, ${Math.round(102 * (1 - progress))})` : `rgb(${r}, ${g}, ${b})`;

            ctx.fillStyle = color;

            if (index === 0) {
                ctx.shadowColor = gameOver ? '#ff3366' : '#00ff88';
                ctx.shadowBlur = 10;
            }

            this._roundRect(ctx, px + padding, py + padding, size, size, radius);
            ctx.fill();

            if (index === 0) {
                ctx.shadowBlur = 0;
                if (!gameOver) this._drawEyes(px + padding, py + padding, size, direction);
            }
        });
    },

    _drawEyes(x, y, size, direction) {
        const ctx = this.ctx;
        const eyeSize = 3;
        const eyeOffset = 5;
        let eye1X, eye1Y, eye2X, eye2Y;

        switch (true) {
            case direction.x === 1:
                eye1X = x + size - eyeOffset; eye1Y = y + eyeOffset;
                eye2X = x + size - eyeOffset; eye2Y = y + size - eyeOffset;
                break;
            case direction.x === -1:
                eye1X = x + eyeOffset; eye1Y = y + eyeOffset;
                eye2X = x + eyeOffset; eye2Y = y + size - eyeOffset;
                break;
            case direction.y === -1:
                eye1X = x + eyeOffset; eye1Y = y + eyeOffset;
                eye2X = x + size - eyeOffset; eye2Y = y + eyeOffset;
                break;
            default:
                eye1X = x + eyeOffset; eye1Y = y + size - eyeOffset;
                eye2X = x + size - eyeOffset; eye2Y = y + size - eyeOffset;
        }

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
    },

    _roundRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }
};

if (typeof window !== 'undefined') {
    window.Render = Render;
}