type ClockListener = (clock: Clock) => void;

/**
 * Class for generating periodic events
 */
export class Clock {
    /**
     * How many ticks will happen per second
     * 
     * Also known as frequency
     */
    public get tickRate() {
        return this._tickRate;
    }

    /**
     * The time interval, in seconds, between each tick
     * 
     * Also known as period
     */
    public get tickDuration() {
        return 1 / this._tickRate;
    }

    /**
     * Counts how many events have happened since the channel has been created
     */
    public get ticks() {
        return this._ticks;
    }
    private _ticks: number = 0;

    /**
     * Gets the UNIX timestamp of when the last tick have happened
     */
    public get lastTick() {
        return this._lastTick;
    }
    private _lastTick: number = 0;

    /**
     * Gets the UNIX timestamp of when the first tick have happened
     */
    public get firstTick() {
        return this._firstTick;
    }
    private _firstTick: number = 0;

    /**
     * The amount of seconds elapsed since the last tick
     */
    public get deltaTime() {
        return (new Date().getTime() - this.lastTick) / 1000;
    }

    /**
    * The amount of seconds elapsed since the first tick
    */
    public get time() {
        return (new Date().getTime() - this.firstTick) / 1000;
    }

    /**
     * The function that will be called every tick
     */
    public get listener() {
        return this._listener;
    }

    private _timer?: NodeJS.Timer;

    /**
     * Verifies whether this clock is running or stopped
     */
    public get running() {
        return this._running;
    }
    private _running: boolean = false;

    private _oneTimeListener?: ClockListener;

    constructor(private _listener: ClockListener, private _tickRate: number) { }

    /**
     * Restarts the clock and changes the tick rate
     * 
     * @param _newTickRate The new wanted tick rate. If omitted, the current tick rate will remain unchanged.
     */
    public reset(newTickRate?: number) {
        this.stop();
        if (newTickRate) this._tickRate = newTickRate;
        this.start();
    }

    /**
     * Sets a function to be executed right after the next tick
     * 
     * @param listener The function to be executed
     */
    public nextTick(listener: ClockListener) {
        this._oneTimeListener = listener;
    }

    /**
     * Forces the clock to tick
     */
    public tick() {
        this._listener(this);

        if (this._oneTimeListener) {
            this._oneTimeListener(this);
            this._oneTimeListener = undefined;
        }
    }

    /**
     * Starts running the clock
     * 
     * @param tickImmediately Should the clock do its first tick right now?
     */
    public start(tickImmediately: boolean = false) {
        this._firstTick = new Date().getTime();

        this._running = true;
        this._timer = setInterval(() => {
            this.tick();
        }, Math.max(Math.round(this.tickDuration * 1000), 1));

        if (tickImmediately) this.tick();

        return this;
    }

    /**
     * Stops running the clock
     */
    public stop() {
        this._running = false;
        if (this._timer) clearInterval(this._timer);

        return this;
    }
}