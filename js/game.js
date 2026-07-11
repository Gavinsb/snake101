const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;
const INPUT_QUEUE_MAX = 3;

const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

const STATE = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

const Game = {
    state: STATE.IDLE,
    score: 0,
    speed: 150,
    _lastTime: 0,
    _accumulator: 0,
    _animationId: null,
    _powerupTimerInterval: null,

    snake: [],
    snakePrev: [],
    direction: DIRECTIONS.RIGHT,
    inputQueue: [],
    alpha: 0,

    ui: {},

    init() {
        Settings.load();
        Audio.init();
        Render.init();
        this._cacheUi();
        this._applyTheme();
        this._applyContrast();
        this._renderDpadVisibility();

        this._bindButtons();
        this._bindSettings();
        this._bindEventBus();

        Input.init(this);

        this.resetGame();
        Render.render(this._renderState());
    },

    _cacheUi() {
        this.ui = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            finalScore: document.getElementById('finalScore'),
            startOverlay: document.getElementById('startOverlay'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            pauseOverlay: document.getElementById('pauseOverlay'),
            settingsOverlay: document.getElementById('settingsOverlay'),
            startBtn: document.getElementById('startBtn'),
            restartBtn: document.getElementById('restartBtn'),
            resumeBtn: document.getElementById('resumeBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            powerupBar: document.getElementById('powerupBar'),
            powerupIcon: document.getElementById('powerupIcon'),
            powerupLabel: document.getElementById('powerupLabel'),
            powerupTimer: document.getElementById('powerupTimer'),
            highScorePrompt: document.getElementById('highScorePrompt'),
            nameInput: document.getElementById('nameInput'),
            gameOverButtons: document.getElementById('gameOverButtons'),
            leaderboardBtn: document.getElementById('leaderboardBtn'),
            leaderboardPanel: document.getElementById('leaderboardPanel'),
            leaderboardList: document.getElementById('leaderboardList'),
            closeLeaderboardBtn: document.getElementById('closeLeaderboardBtn'),
            dpad: document.getElementById('dpad'),
            gridSizeSelect: document.getElementById('gridSizeSelect'),
            speedSelect: document.getElementById('speedSelect'),
            themeSelect: document.getElementById('themeSelect'),
            soundToggle: document.getElementById('soundToggle'),
            dpadToggle: document.getElementById('dpadToggle'),
            contrastToggle: document.getElementById('contrastToggle'),
            responsivenessRange: document.getElementById('responsivenessRange'),
            responsivenessValue: document.getElementById('responsivenessValue')
        };
    },

    _bindButtons() {
        this.ui.startBtn.addEventListener('click', () => this.startGame());
        this.ui.restartBtn.addEventListener('click', () => this._saveAndRestart());
        this.ui.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.ui.settingsBtn.addEventListener('click', () => this.openSettings());
        this.ui.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.ui.leaderboardBtn.addEventListener('click', () => this._openLeaderboard());
        this.ui.closeLeaderboardBtn.addEventListener('click', () => this._closeLeaderboard());

        const input = this.ui.nameInput;
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._saveAndRestart();
            });
            input.addEventListener('input', () => {
                const v = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
                if (input.value !== v) input.value = v;
            });
        }
    },

    _saveAndRestart() {
        if (this.state === STATE.GAME_OVER && this._unsavedHighScore) {
            Settings.addHighScore(this.ui.nameInput.value, this.score);
            this._renderLeaderboard();
            this.ui.highScorePrompt.classList.add('hidden');
            this._unsavedHighScore = false;
        }
        this.startGame();
    },

    _bindSettings() {
        this._syncSettingsForm();
        Events.on('settings:changed', () => this._syncSettingsForm());

        this.ui.gridSizeSelect.addEventListener('change', (e) => Settings.set('gridSize', parseInt(e.target.value, 10)));
        this.ui.speedSelect.addEventListener('change', (e) => Settings.set('initialSpeed', parseInt(e.target.value, 10)));
        this.ui.themeSelect.addEventListener('change', (e) => {
            Settings.set('colorTheme', e.target.value);
            this._applyTheme();
        });
        this.ui.soundToggle.addEventListener('change', (e) => Settings.set('sound', e.target.checked));
        this.ui.dpadToggle.addEventListener('change', (e) => {
            Settings.set('dpad', e.target.checked ? 'on' : 'off');
            this._renderDpadVisibility();
        });
        this.ui.contrastToggle.addEventListener('change', (e) => {
            Settings.set('highContrast', e.target.checked);
            this._applyContrast();
        });
        this.ui.responsivenessRange.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            Settings.set('inputResponsiveness', v);
            this.ui.responsivenessValue.textContent = `${Math.round(v * 100)}%`;
        });
    },

    _syncSettingsForm() {
        const s = Settings.getAll();
        this.ui.gridSizeSelect.value = s.gridSize;
        this.ui.speedSelect.value = s.initialSpeed;
        this.ui.themeSelect.value = s.colorTheme;
        this.ui.soundToggle.checked = s.sound;
        this.ui.dpadToggle.checked = s.dpad === 'on' || (s.dpad === 'auto' && this._isTouchDevice());
        this.ui.contrastToggle.checked = s.highContrast;
        this.ui.responsivenessRange.value = s.inputResponsiveness;
        this.ui.responsivenessValue.textContent = `${Math.round(s.inputResponsiveness * 100)}%`;
    },

    _bindEventBus() {
        Events.on('food:eaten', (data) => this._onFoodEaten(data));
        Events.on('powerup:state', (data) => this._renderPowerupBar(data));
        Events.on('level:up', (data) => {
            this.ui.level.textContent = data.level;
            this.speed = Levels.getSpeedTier(this.speed, MIN_SPEED);
        });
    },

    _applyTheme() {
        const theme = Settings.get('colorTheme');
        if (theme === 'auto') {
            document.body.removeAttribute('data-theme');
            document.documentElement.classList.remove('force-theme');
        } else {
            document.body.setAttribute('data-theme', theme);
            document.documentElement.classList.add('force-theme');
        }
    },

    _applyContrast() {
        if (Settings.get('highContrast')) {
            document.body.setAttribute('data-contrast', 'high');
        } else {
            document.body.removeAttribute('data-contrast');
        }
    },

    _isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    },

    _renderDpadVisibility() {
        const mode = Settings.get('dpad');
        const show = mode === 'on' || (mode === 'auto' && this._isTouchDevice());
        this.ui.dpad.classList.toggle('hidden', !show);
    },

    setDirection(dirName) {
        if (this.state !== STATE.PLAYING) return;
        const newDir = DIRECTIONS[dirName];
        if (!newDir) return;
        const last = this.inputQueue.length > 0
            ? this.inputQueue[this.inputQueue.length - 1]
            : this.direction;
        if (
            (newDir.x === -last.x && newDir.y === -last.y) ||
            (newDir.x === last.x && newDir.y === last.y)
        ) {
            return;
        }
        if (this.inputQueue.length >= INPUT_QUEUE_MAX) return;
        this.inputQueue.push(newDir);

        const clamp = Settings.get('inputResponsiveness');
        if (clamp > 0) {
            const threshold = this.speed * (1 - clamp);
            if (this._accumulator < threshold) {
                this._accumulator = threshold;
            }
        }
    },

    handleVisibilityHidden() {
        if (this.state === STATE.PLAYING) this.pauseGame();
    },

    handleWindowBlur() {
        if (this.state === STATE.PLAYING) this.pauseGame();
    },

    startGame() {
        this._hideAllOverlays();
        this.resetGame();
        this.state = STATE.PLAYING;
        Events.emit('game:start');
        this._lastTime = performance.now();
        this._accumulator = 0;
        this._animationId = requestAnimationFrame((t) => this._gameLoop(t));
    },

    pauseGame() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.PAUSED;
        cancelAnimationFrame(this._animationId);
        this.ui.pauseOverlay.classList.remove('hidden');
        Events.emit('game:pause');
    },

    resumeGame() {
        if (this.state !== STATE.PAUSED) return;
        this.state = STATE.PLAYING;
        this.ui.pauseOverlay.classList.add('hidden');
        this._lastTime = performance.now();
        this._animationId = requestAnimationFrame((t) => this._gameLoop(t));
        Events.emit('game:resume');
    },

    gameOver() {
        this.state = STATE.GAME_OVER;
        cancelAnimationFrame(this._animationId);
        Events.emit('snake:die');
        Events.emit('game:over', { score: this.score });

        this.ui.finalScore.textContent = this.score;
        this.ui.leaderboardPanel.classList.add('hidden');
        this.ui.gameOverButtons.classList.remove('hidden');
        const isNewHigh = Settings.isHighScore(this.score);
        this._unsavedHighScore = isNewHigh && this.score > 0;
        if (this._unsavedHighScore) {
            this.ui.highScorePrompt.classList.remove('hidden');
            this.ui.nameInput.value = '';
            this.ui.nameInput.focus();
        } else {
            this.ui.highScorePrompt.classList.add('hidden');
        }

        this._renderLeaderboard();
        Render.render(this._renderState(true));
        this.ui.gameOverOverlay.classList.remove('hidden');
    },

    _renderLeaderboard() {
        const top = Settings.getTopScores(5);
        this.ui.leaderboardList.innerHTML = '';
        if (top.length === 0) {
            const li = document.createElement('li');
            li.className = 'lb-empty';
            li.textContent = 'No scores yet';
            this.ui.leaderboardList.appendChild(li);
            return;
        }
        top.forEach((entry) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="lb-name">${entry.name}</span><span class="lb-score">${entry.score}</span>`;
            this.ui.leaderboardList.appendChild(li);
        });
    },

    _openLeaderboard() {
        this.ui.gameOverButtons.classList.add('hidden');
        this.ui.highScorePrompt.classList.add('hidden');
        this._renderLeaderboard();
        this.ui.leaderboardPanel.classList.remove('hidden');
    },

    _closeLeaderboard() {
        this.ui.leaderboardPanel.classList.add('hidden');
        this.ui.gameOverButtons.classList.remove('hidden');
        if (this.state === STATE.GAME_OVER &&
            Settings.isHighScore(this.score) && this.score > 0) {
            this.ui.highScorePrompt.classList.remove('hidden');
        }
    },

    resetGame() {
        const gridSize = Settings.get('gridSize');
        const cx = Math.floor(gridSize / 2);
        const cy = Math.floor(gridSize / 2);
        this.snake = [
            { x: cx, y: cy },
            { x: cx - 1, y: cy },
            { x: cx - 2, y: cy }
        ];
        this.snakePrev = this.snake.map(s => ({ ...s }));
        this.direction = DIRECTIONS.RIGHT;
        this.inputQueue = [];
        this._unsavedHighScore = false;
        this.score = 0;
        this.speed = Settings.get('initialSpeed');
        this.alpha = 0;
        this._accumulator = 0;

        Levels.reset();
        Powerups.reset();
        Food.reset();

        this.ui.score.textContent = '0';
        this.ui.level.textContent = '1';
        this._renderPowerupBar(null);

        Render.rebuildCanvas();
        Food.spawn(this.snake, Levels.getWalls());
    },

    _gameLoop(currentTime) {
        if (this.state !== STATE.PLAYING) return;

        const deltaTime = currentTime - this._lastTime;
        this._lastTime = currentTime;
        this._accumulator += deltaTime;

        while (this._accumulator >= this.speed) {
            this._update();
            this._accumulator -= this.speed;
            if (this.state !== STATE.PLAYING) return;
        }

        this.alpha = this._accumulator / this.speed;
        Render.render(this._renderState());
        this._animationId = requestAnimationFrame((t) => this._gameLoop(t));
    },

    _update() {
        this.snakePrev = this.snake.map(s => ({ ...s }));
        if (this.inputQueue.length > 0) {
            this.direction = this.inputQueue.shift();
        }

        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        const gridSize = Settings.get('gridSize');
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            this.gameOver();
            return;
        }

        if (Levels.hasWallAt(head.x, head.y)) {
            this.gameOver();
            return;
        }

        const willEat = Food.isAt(head.x, head.y);
        const willShrinkEat = willEat && Food.getInfo().effect === 'shrink';
        const checkBody = willShrinkEat ? this.snake.slice(0, -2) : this.snake;
        if (checkBody.some(seg => seg.x === head.x && seg.y === head.y)) {
            this.gameOver();
            return;
        }

        const willPowerup = Powerups.isAt(head.x, head.y);

        this.snake.unshift(head);

        if (willPowerup) {
            Powerups.collect();
        }

        if (willEat) {
            const info = Food.getInfo();
            const multiplier = Powerups.isActive('double') ? 2 : 1;
            this.score += info.score * multiplier;
            this.ui.score.textContent = this.score;
            Events.emit('food:eaten', { type: Food.current.type, score: info.score });

            if (info.effect === 'speed' && this.speed > MIN_SPEED) {
                this.speed = Math.max(MIN_SPEED, this.speed - SPEED_INCREMENT * 3);
            }
            if (info.effect === 'shrink' && this.snake.length > 3) {
                this.snake.pop();
                if (this.snake.length > 3) this.snake.pop();
            }

            const levelUp = Levels.onFoodEaten();
            if (levelUp) {
                this.speed = Levels.getSpeedTier(this.speed, MIN_SPEED);
            }

            Food.spawn(this.snake, Levels.getWalls());
            Powerups.maybeSpawnOnFoodEaten(this.snake, Levels.getWalls());
        } else {
            this.snake.pop();
        }

        Events.emit('snake:move', { head });
    },

    _onFoodEaten(data) {
        // audio handled by audio module via same event
    },

    _renderState(gameOver = false) {
        return {
            snake: this.snake,
            snakePrev: this.snakePrev,
            direction: this.direction,
            alpha: this.alpha,
            food: Food.current,
            foodType: Food.current.type,
            walls: Levels.getWalls(),
            gameOver: gameOver || this.state === STATE.GAME_OVER
        };
    },

    _renderPowerupBar(data) {
        if (!data) {
            this.ui.powerupBar.classList.add('hidden');
            if (this._powerupTimerInterval) {
                clearInterval(this._powerupTimerInterval);
                this._powerupTimerInterval = null;
            }
            return;
        }
        const info = Powerups.getInfo(data.type);
        if (!info) return;
        this.ui.powerupBar.classList.remove('hidden');
        this.ui.powerupIcon.textContent = info.icon;
        this.ui.powerupIcon.style.color = info.color;
        this.ui.powerupLabel.textContent = info.label;
        this.ui.powerupLabel.style.color = info.color;
        this.ui.powerupTimer.style.background = info.color;

        if (this._powerupTimerInterval) clearInterval(this._powerupTimerInterval);
        this._powerupTimerInterval = setInterval(() => {
            const progress = Powerups.getProgress();
            this.ui.powerupTimer.style.width = `${Math.max(0, progress * 100)}%`;
            if (progress <= 0) {
                clearInterval(this._powerupTimerInterval);
                this._powerupTimerInterval = null;
            }
        }, 50);
    },

    _hideAllOverlays() {
        this.ui.startOverlay.classList.add('hidden');
        this.ui.gameOverOverlay.classList.add('hidden');
        this.ui.pauseOverlay.classList.add('hidden');
        this.ui.settingsOverlay.classList.add('hidden');
        this.ui.leaderboardPanel.classList.add('hidden');
        this.ui.gameOverButtons.classList.remove('hidden');
    },

    openSettings() {
        if (this.state === STATE.PLAYING) this.pauseGame();
        this.ui.settingsOverlay.classList.remove('hidden');
    },

    closeSettings() {
        this.ui.settingsOverlay.classList.add('hidden');
        if (this.state === STATE.PAUSED && this.state !== STATE.GAME_OVER) {
            // remain paused; user resumes manually
        }
    }
};

let _gameInitialized = false;
function _bootGame() {
    if (_gameInitialized) return;
    _gameInitialized = true;
    Game.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootGame);
} else {
    _bootGame();
}

window.Game = Game;