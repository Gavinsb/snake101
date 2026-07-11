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

const Powerups = {
    current: null,
    _expireTimer: null,
    _activeSpawn: null,

    reset() {
        this.clearTimer();
        this.clearSpawn();
        this.current = null;
    },

    clearTimer() {
        if (this._expireTimer) {
            clearTimeout(this._expireTimer);
            this._expireTimer = null;
        }
    },

    clearSpawn() {
        if (this._activeSpawn) {
            this._activeSpawn = null;
        }
    },

    maybeSpawnOnFoodEaten(snake, walls) {
        if (this._activeSpawn || this.current) return false;
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
        this.clearTimer();
        const info = POWERUP_TYPES[type];
        if (!info) return;

        this.current = {
            type,
            expires: performance.now() + info.duration,
            duration: info.duration
        };

        Events.emit('powerup:activate', { type, duration: info.duration });
        Events.emit('powerup:state', { ...this.current });

        this._expireTimer = setTimeout(() => this.expire(), info.duration);
    },

    expire() {
        if (!this.current) return;
        const type = this.current.type;
        this.current = null;
        this.clearTimer();
        Events.emit('powerup:expire', { type });
        Events.emit('powerup:state', null);
    },

    isActive(type = null) {
        if (!this.current) return false;
        return type ? this.current.type === type : true;
    },

    getTimeRemaining() {
        if (!this.current) return 0;
        return Math.max(0, this.current.expires - performance.now());
    },

    getProgress() {
        if (!this.current) return 0;
        return this.getTimeRemaining() / this.current.duration;
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