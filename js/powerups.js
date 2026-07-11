'use strict';

const POWERUP_TYPES = {
    invincible: {
        duration: 5000,
        color: '#ff00ff',
        glowColor: 'rgba(255, 0, 255, 0.6)',
        icon: '◯',
        label: 'INVINCIBLE'
    },
    slowmo: {
        duration: 5000,
        color: '#00ffff',
        glowColor: 'rgba(0, 255, 255, 0.6)',
        icon: '◐',
        label: 'SLOW-MO'
    },
    double: {
        duration: 10000,
        color: '#ffff00',
        glowColor: 'rgba(255, 255, 0, 0.6)',
        icon: '×2',
        label: 'DOUBLE'
    }
};

const SPAWN_CHANCE = 0.10;
const MAX_ACTIVE = 3;

const Powerups = {
    current: [],
    _activeSpawn: null,

    reset() {
        this.clearAllTimers();
        this.clearSpawn();
        this.current = [];
    },

    clearAllTimers() {
        this.current.forEach(entry => {
            if (entry.timerId) clearTimeout(entry.timerId);
        });
        this.current = [];
    },

    clearTimer(index) {
        if (index >= 0 && index < this.current.length) {
            if (this.current[index].timerId) clearTimeout(this.current[index].timerId);
            this.current.splice(index, 1);
        }
    },

    clearSpawn() {
        if (this._activeSpawn) {
            this._activeSpawn = null;
        }
    },

    maybeSpawnOnFoodEaten(snake, walls) {
        if (this._activeSpawn) return false;
        if (Math.random() > SPAWN_CHANCE) return false;
        return this.spawnRandom(snake, walls);
    },

    spawnRandom(snake, walls) {
        const gridSize = Settings.get('gridSize');
        const occupied = new Set([
            ...snake.map(s => `${s.x},${s.y}`),
            ...(walls || []).map(w => `${w.x},${w.y}`),
            `${Food.current.x},${Food.current.y}`
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
        const types = Object.keys(POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        this._activeSpawn = { ...pos, type };
        return true;
    },

    isAt(x, y) {
        return this._activeSpawn && this._activeSpawn.x === x && this._activeSpawn.y === y;
    },

    collect() {
        if (!this._activeSpawn) return null;
        const type = this._activeSpawn.type;
        this._activeSpawn = null;
        this.activate(type);
        return type;
    },

    activate(type) {
        const info = POWERUP_TYPES[type];
        if (!info) return;

        if (this.current.length >= MAX_ACTIVE) {
            this.clearTimer(0);
        }

        const entry = {
            type,
            expires: performance.now() + info.duration,
            duration: info.duration,
            timerId: setTimeout(() => this.expire(entry), info.duration)
        };

        this.current.push(entry);

        Events.emit('powerup:activate', { type, duration: info.duration });
        Events.emit('powerup:state', this.current.map(e => ({ type: e.type, expires: e.expires, duration: e.duration })));
    },

    expire(entry) {
        const idx = this.current.indexOf(entry);
        if (idx === -1) return;
        if (this.current[idx].timerId) clearTimeout(this.current[idx].timerId);
        const type = this.current[idx].type;
        this.current.splice(idx, 1);
        Events.emit('powerup:expire', { type });
        Events.emit('powerup:state', this.current.map(e => ({ type: e.type, expires: e.expires, duration: e.duration })));
    },

    isActive(type = null) {
        if (this.current.length === 0) return false;
        return type ? this.current.some(e => e.type === type) : true;
    },

    getTimeRemaining() {
        if (this.current.length === 0) return 0;
        const now = performance.now();
        return Math.max(0, ...this.current.map(e => e.expires - now));
    },

    getProgress() {
        if (this.current.length === 0) return 0;
        const now = performance.now();
        return Math.max(0, ...this.current.map(e => (e.expires - now) / e.duration));
    },

    getInfo(type) {
        return POWERUP_TYPES[type] || null;
    },

    getSpawnInfo() {
        return this._activeSpawn;
    }
};

if (typeof window !== 'undefined') {
    window.Powerups = Powerups;
}
