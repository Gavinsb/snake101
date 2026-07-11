'use strict';

const FOOD_TYPES = {
    normal: {
        weight: 70,
        score: 10,
        color: '#ff3366',
        glowColor: 'rgba(255, 51, 102, 0.6)',
        icon: null,
        effect: 'grow'
    },
    bonus: {
        weight: 15,
        score: 50,
        color: '#ffd700',
        glowColor: 'rgba(255, 215, 0, 0.6)',
        icon: '★',
        effect: 'grow'
    },
    speed: {
        weight: 10,
        score: 20,
        color: '#33aaff',
        glowColor: 'rgba(51, 170, 255, 0.6)',
        icon: '⚡',
        effect: 'speed'
    },
    shrink: {
        weight: 5,
        score: 5,
        color: '#ff6699',
        glowColor: 'rgba(255, 102, 153, 0.6)',
        icon: '↘',
        effect: 'shrink'
    }
};

const Food = {
    current: { x: 0, y: 0, type: 'normal' },

    reset() {
        this.current = { x: 0, y: 0, type: 'normal' };
    },

    getTypeInfo(type) {
        return FOOD_TYPES[type] || FOOD_TYPES.normal;
    },

    _weightedRandomType() {
        const totalWeight = Object.values(FOOD_TYPES).reduce((sum, t) => sum + t.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const [type, info] of Object.entries(FOOD_TYPES)) {
            roll -= info.weight;
            if (roll <= 0) return type;
        }
        return 'normal';
    },

    spawn(snake, blocked = []) {
        const gridSize = Settings.get('gridSize');
        const occupied = new Set([
            ...snake.map(s => `${s.x},${s.y}`),
            ...blocked.map(w => `${w.x},${w.y}`)
        ]);

        const empty = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!occupied.has(`${x},${y}`)) {
                    empty.push({ x, y });
                }
            }
        }

        if (empty.length === 0) return false;

        const pos = empty[Math.floor(Math.random() * empty.length)];
        const type = this._weightedRandomType();
        this.current = { ...pos, type };
        Events.emit('food:spawned', { ...this.current });
        return true;
    },

    isAt(x, y) {
        return this.current.x === x && this.current.y === y;
    },

    getInfo() {
        return this.getTypeInfo(this.current.type);
    }
};

if (typeof window !== 'undefined') {
    window.Food = Food;
}