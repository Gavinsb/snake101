'use strict';

const DEFAULT_SETTINGS = {
    gridSize: 20,
    initialSpeed: 150,
    colorTheme: 'auto',
    sound: true,
    dpad: 'auto',
    highContrast: false,
    inputResponsiveness: 0.5,
    bestLevel: 0
};

const SETTINGS_KEY = 'snakeSettings';
const HIGH_SCORES_KEY = 'snakeHighScores';
const MAX_HIGH_SCORES = 50;

const Settings = {
    _state: { ...DEFAULT_SETTINGS },

    load() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this._state = { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (err) {
            console.warn('Failed to load settings:', err);
        }
        return { ...this._state };
    },

    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._state));
            Events.emit('settings:changed', { ...this._state });
        } catch (err) {
            console.warn('Failed to save settings:', err);
        }
    },

    get(key) {
        return this._state[key];
    },

    set(key, value) {
        this._state[key] = value;
        this.save();
    },

    getAll() {
        return { ...this._state };
    },

    reset() {
        this._state = { ...DEFAULT_SETTINGS };
        this.save();
    },

    loadHighScores() {
        try {
            const saved = localStorage.getItem(HIGH_SCORES_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (err) {
            console.warn('Failed to load high scores:', err);
        }
        return [];
    },

    saveHighScores(scores) {
        try {
            localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores.slice(0, MAX_HIGH_SCORES)));
        } catch (err) {
            console.warn('Failed to save high scores:', err);
        }
    },

    addHighScore(name, score) {
        const scores = this.loadHighScores();
        const entry = {
            name: (name || 'AAA').toUpperCase().slice(0, 3),
            score,
            date: new Date().toISOString()
        };
        scores.push(entry);
        scores.sort((a, b) => b.score - a.score);
        this.saveHighScores(scores);
        return scores;
    },

    isHighScore(score) {
        if (score <= 0) return false;
        const scores = this.loadHighScores();
        if (scores.length < 5) return true;
        return score > scores[4].score;
    },

    getTopScores(n = 5) {
        return this.loadHighScores().slice(0, n);
    }
};

if (typeof window !== 'undefined') {
    window.Settings = Settings;
}