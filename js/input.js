'use strict';

const Input = {
    _state: null,
    _touchStartX: 0,
    _touchStartY: 0,
    _minSwipe: 30,

    init(game) {
        this._state = game;
        this._bindKeyboard();
        this._bindTouch();
        this._bindWindow();
    },

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => this._handleKeydown(e));
    },

    _bindTouch() {
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });

        const dpad = document.getElementById('dpad');
        if (dpad) {
            dpad.addEventListener('touchstart', (e) => this._handleDpadTouch(e), { passive: false });
            dpad.addEventListener('click', (e) => this._handleDpadClick(e));
        }
    },

    _bindWindow() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._state.handleVisibilityHidden();
        });
        window.addEventListener('blur', () => this._state.handleWindowBlur());
    },

    _handleKeydown(e) {
        const game = this._state;
        const key = e.key;

        const DIRS = {
            'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
            'w': 'UP', 's': 'DOWN', 'a': 'LEFT', 'd': 'RIGHT',
            'W': 'UP', 'S': 'DOWN', 'A': 'LEFT', 'D': 'RIGHT'
        };

        if (DIRS[key]) {
            if (game.state === 'playing') {
                e.preventDefault();
                game.setDirection(DIRS[key]);
                return;
            }
            if (key.startsWith('Arrow')) {
                e.preventDefault();
                return;
            }
        }

        if (key === ' ' || key === 'Enter') {
            if (game.state === 'idle' || game.state === 'gameOver') {
                e.preventDefault();
                game.startGame();
            }
            return;
        }

        if (key === 'Escape' || key === 'p' || key === 'P') {
            if (game.state === 'playing') {
                game.pauseGame();
            } else if (game.state === 'paused') {
                game.resumeGame();
            }
        }
    },

    _handleTouchStart(e) {
        if (this._state.state !== 'playing') return;
        const touch = e.touches[0];
        this._touchStartX = touch.clientX;
        this._touchStartY = touch.clientY;
        e.preventDefault();
    },

    _handleTouchMove(e) {
        if (this._state.state !== 'playing') return;
        e.preventDefault();
    },

    _handleTouchEnd(e) {
        if (this._state.state !== 'playing') return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this._touchStartX;
        const deltaY = touch.clientY - this._touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > this._minSwipe) {
                this._state.setDirection(deltaX > 0 ? 'RIGHT' : 'LEFT');
            }
        } else {
            if (Math.abs(deltaY) > this._minSwipe) {
                this._state.setDirection(deltaY > 0 ? 'DOWN' : 'UP');
            }
        }
    },

    _handleDpadTouch(e) {
        e.preventDefault();
        const dir = e.target.dataset.dir;
        if (dir && this._state.state === 'playing') {
            this._state.setDirection(dir.toUpperCase());
        }
    },

    _handleDpadClick(e) {
        const dir = e.target.dataset.dir;
        if (dir && this._state.state === 'playing') {
            this._state.setDirection(dir.toUpperCase());
        }
    }
};

if (typeof window !== 'undefined') {
    window.Input = Input;
}