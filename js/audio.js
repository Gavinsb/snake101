const Audio = {
    ctx: null,
    enabled: true,
    _lastMoveTime: 0,
    _moveThrottle: 80,

    init() {
        this.enabled = Settings.get('sound');
        this._bindEvents();
    },

    _bindEvents() {
        Events.on('settings:changed', (s) => {
            this.enabled = s.sound !== false;
        });

        Events.on('game:start', () => this.resumeContext());
        Events.on('food:eaten', (data) => this.eat(data.type));
        Events.on('food:spawned', () => {});
        Events.on('snake:die', () => this.death());
        Events.on('snake:move', () => this.move());
        Events.on('powerup:activate', (data) => this.powerup(data.type));
        Events.on('powerup:expire', () => this.expire());
        Events.on('level:up', () => this.levelUp());
    },

    resumeContext() {
        if (!this.enabled) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) this.ctx = new Ctx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (err) {
            console.warn('AudioContext init failed:', err);
        }
    },

    _tone(freq, duration, type = 'sine', volume = 0.15, sweepTo = null) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (sweepTo !== null) {
            osc.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
        }
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    },

    eat(type = 'normal') {
        if (!this.enabled) return;
        this.resumeContext();
        switch (type) {
            case 'bonus':
                this._tone(660, 0.12, 'square', 0.15, 1320);
                setTimeout(() => this._tone(1100, 0.08, 'square', 0.12), 60);
                break;
            case 'speed':
                this._tone(440, 0.1, 'sawtooth', 0.13, 880);
                break;
            case 'shrink':
                this._tone(330, 0.12, 'triangle', 0.13, 220);
                break;
            default:
                this._tone(440, 0.1, 'square', 0.15, 880);
        }
    },

    move() {
        const now = performance.now();
        if (now - this._lastMoveTime < this._moveThrottle) return;
        this._lastMoveTime = now;
        this._tone(80, 0.02, 'sine', 0.04);
    },

    death() {
        if (!this.enabled) return;
        this.resumeContext();
        this._tone(330, 0.3, 'sawtooth', 0.2, 80);
        setTimeout(() => this._tone(220, 0.2, 'sawtooth', 0.15, 60), 100);
    },

    powerup(type) {
        if (!this.enabled) return;
        this.resumeContext();
        const freqs = {
            invincible: 880,
            slowmo: 440,
            double: 660
        };
        this._tone(freqs[type] || 600, 0.15, 'sine', 0.15, freqs[type] * 1.5);
    },

    expire() {
        this._tone(300, 0.1, 'sine', 0.1, 200);
    },

    levelUp() {
        if (!this.enabled) return;
        this.resumeContext();
        this._tone(523, 0.1, 'square', 0.12);
        setTimeout(() => this._tone(659, 0.1, 'square', 0.12), 80);
        setTimeout(() => this._tone(784, 0.15, 'square', 0.12), 160);
    }
};

if (typeof window !== 'undefined') {
    window.Audio = Audio;
}