'use strict';

const FOODS_PER_LEVEL = 5;
const SPEED_TIER_DROP = 10;

// Hand-designed wall patterns expressed as fractions of grid (relative coords 0-1).
// Walls only placed at level >= 2. Patterns cycle with modulo.
const WALL_PATTERNS = [
    [],
    [
        { fx: 0.3, fy: 0.3 }, { fx: 0.4, fy: 0.3 }, { fx: 0.5, fy: 0.3 },
        { fx: 0.5, fy: 0.6 }, { fx: 0.6, fy: 0.6 }, { fx: 0.7, fy: 0.6 }
    ],
    [
        { fx: 0.25, fy: 0.25 }, { fx: 0.75, fy: 0.25 },
        { fx: 0.25, fy: 0.75 }, { fx: 0.75, fy: 0.75 }
    ],
    [
        { fx: 0.5, fy: 0.2 }, { fx: 0.5, fy: 0.3 }, { fx: 0.5, fy: 0.4 },
        { fx: 0.5, fy: 0.6 }, { fx: 0.5, fy: 0.7 }, { fx: 0.5, fy: 0.8 }
    ],
    [
        { fx: 0.2, fy: 0.5 }, { fx: 0.3, fy: 0.5 }, { fx: 0.4, fy: 0.5 },
        { fx: 0.6, fy: 0.5 }, { fx: 0.7, fy: 0.5 }, { fx: 0.8, fy: 0.5 }
    ],
    [
        { fx: 0.2, fy: 0.2 }, { fx: 0.8, fy: 0.2 },
        { fx: 0.2, fy: 0.5 }, { fx: 0.8, fy: 0.5 },
        { fx: 0.2, fy: 0.8 }, { fx: 0.8, fy: 0.8 }
    ],
    [
        { fx: 0.3, fy: 0.3 }, { fx: 0.5, fy: 0.35 }, { fx: 0.7, fy: 0.3 },
        { fx: 0.3, fy: 0.7 }, { fx: 0.5, fy: 0.65 }, { fx: 0.7, fy: 0.7 }
    ],
    [
        { fx: 0.4, fy: 0.15 }, { fx: 0.6, fy: 0.15 },
        { fx: 0.15, fy: 0.4 }, { fx: 0.85, fy: 0.4 },
        { fx: 0.15, fy: 0.6 }, { fx: 0.85, fy: 0.6 },
        { fx: 0.4, fy: 0.85 }, { fx: 0.6, fy: 0.85 }
    ],
    [
        { fx: 0.15, fy: 0.35 }, { fx: 0.25, fy: 0.35 }, { fx: 0.35, fy: 0.35 },
        { fx: 0.65, fy: 0.65 }, { fx: 0.75, fy: 0.65 }, { fx: 0.85, fy: 0.65 }
    ],
    [
        { fx: 0.5, fy: 0.1 }, { fx: 0.5, fy: 0.25 },
        { fx: 0.35, fy: 0.5 }, { fx: 0.65, fy: 0.5 },
        { fx: 0.5, fy: 0.75 }, { fx: 0.5, fy: 0.9 }
    ],
    [
        { fx: 0.1, fy: 0.3 }, { fx: 0.3, fy: 0.3 },
        { fx: 0.7, fy: 0.5 }, { fx: 0.9, fy: 0.5 },
        { fx: 0.1, fy: 0.7 }, { fx: 0.3, fy: 0.7 }
    ],
    [
        { fx: 0.5, fy: 0.2 }, { fx: 0.2, fy: 0.5 },
        { fx: 0.5, fy: 0.5 }, { fx: 0.8, fy: 0.5 },
        { fx: 0.5, fy: 0.8 }
    ],
    [
        { fx: 0.2, fy: 0.2 }, { fx: 0.35, fy: 0.2 },
        { fx: 0.65, fy: 0.35 }, { fx: 0.8, fy: 0.35 },
        { fx: 0.2, fy: 0.65 }, { fx: 0.35, fy: 0.65 },
        { fx: 0.65, fy: 0.8 }, { fx: 0.8, fy: 0.8 }
    ]
];

const Levels = {
    level: 1,
    foodsEaten: 0,
    walls: [],

    reset() {
        this.level = 1;
        this.foodsEaten = 0;
        this.walls = [];
    },

    onFoodEaten() {
        this.foodsEaten++;
        if (this.foodsEaten >= FOODS_PER_LEVEL) {
            this.foodsEaten = 0;
            this.levelUp();
            return true;
        }
        return false;
    },

    levelUp() {
        this.level++;
        this._applyWalls();
        Events.emit('level:up', { level: this.level });
    },

    _applyWalls() {
        const gridSize = Settings.get('gridSize');
        const patternIdx = (this.level - 2) % WALL_PATTERNS.length;
        const pattern = WALL_PATTERNS[Math.max(0, patternIdx)];
        this.walls = pattern.map(({ fx, fy }) => ({
            x: Math.round(fx * (gridSize - 1)),
            y: Math.round(fy * (gridSize - 1))
        }));
    },

    getSpeedTier(currentSpeed, minSpeed) {
        const tier = Math.floor((this.level - 1) / 2);
        return Math.max(minSpeed, currentSpeed - tier * SPEED_TIER_DROP);
    },

    hasWallAt(x, y) {
        return this.walls.some(w => w.x === x && w.y === y);
    },

    getWalls() {
        return [...this.walls];
    }
};

if (typeof window !== 'undefined') {
    window.Levels = Levels;
}