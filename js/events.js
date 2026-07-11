const Events = {
    _handlers: new Map(),

    on(event, fn) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(fn);
        return () => this.off(event, fn);
    },

    off(event, fn) {
        const handlers = this._handlers.get(event);
        if (handlers) {
            handlers.delete(fn);
        }
    },

    emit(event, data) {
        const handlers = this._handlers.get(event);
        if (handlers) {
            handlers.forEach(fn => {
                try {
                    fn(data);
                } catch (err) {
                    console.error(`Error in handler for ${event}:`, err);
                }
            });
        }
    },

    clear(event) {
        if (event) {
            this._handlers.delete(event);
        } else {
            this._handlers.clear();
        }
    }
};

if (typeof window !== 'undefined') {
    window.Events = Events;
}