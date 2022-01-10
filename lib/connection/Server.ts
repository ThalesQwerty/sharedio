import { KeyValue } from "../utils";
import { User } from "../schema";
import { Request, AuthRequest, Client } from ".";
import WS from "ws";

const DEFAULT_PORT = 3000;
const DEFAULT_TICK_RATE = 64;

interface ServerConfig {
    debug?: boolean;
    port?: number;
    wsOptions?: KeyValue;

    /**
     * How many ticks will happen per second (default is 64)
     */
    tickRate?: number;

    on?: {
        /**
         * This function will be called whenever an user connects
         */
        connection?: (user: User) => void;

        /**
         * This function will be called whenever an user disconnects
         */
        disconnection?: (user: User) => void;

        /**
         * This function will be called whenever a message is recieved from an user's websocket client
         */
        message?: (user: User, message: Request) => void;

        /**
         * This function will be called every server tick
         */
        tick?: (server: Server) => void | (() => void);
    };
}

export class Server {
    static current: Server;

    private wss?: WS.Server;
    private tickIntervalRef: any = undefined;

    public get config() {
        return this._config;
    }
    private _config: ServerConfig;

    public get port() {
        return this.wss?.options.port;
    }

    public get host() {
        return this.wss?.options.host;
    }

    public get path() {
        const path = this.wss?.options.path;
        if (!path) return "";
        if (path[0] !== "/") return `/${path}`;
        return path;
    }

    public get url() {
        if (!this.port || !this.host) return undefined;
        return `ws://${this.host}${this.path}:${this.port}`;
    }

    /**
     * Verifies if the server is currently online
     */
    public get isOnline() {
        return this._isOnline;
    }
    private _isOnline: boolean = false;

    /**
     * Lists all users (including offline ones) on the server
     */
    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    /**
     * Lists all online users on the server
     */
    public get onlineUsers() {
        return this._users.filter((user) => user.client.online);
    }

    /**
     * Lists all offline users on the server
     */
    public get offlineUsers() {
        return this._users.filter((user) => !user.client.online);
    }

    /**
     * Server's default room.
     *
     * All users automatically join this room when they connect to the server.
     */
    // public mainRoom: Room;

    /**
     * How many tick events will happen per second
     */
    public get tickRate() {
        return this.config.tickRate ?? DEFAULT_TICK_RATE;
    }

    /**
     * Counts how many ticks have happened since the server started
     */
    public get ticks() {
        return this._ticks;
    }
    private _ticks: number = 0;

    /**
     * Measures the time (in seconds) elapsed since the last server tick
     */
    public get deltaTime() {
        return (
            (new Date().getTime() - this._lastTickTimestamp) / 1000
        );
    }
    private _lastTickTimestamp: number = 0;

    /**
     * Measures the time (in seconds) elapsed since the initialization of the server
     */
    public get time() {
        return (
            (new Date().getTime() - this._serverStartTimestamp) / 1000
        );
    }
    private _serverStartTimestamp: number = 0;

    constructor(config: ServerConfig = {}) {
        Server.current = this;

        config.port ??= DEFAULT_PORT;
        config.tickRate ??= DEFAULT_TICK_RATE;
        config.debug ??= false;

        this._config = config;
    }

    private log(message: any) {
        if (this._config.debug) console.log(message);
    }

    /**
     * Initializes the server
     */
    start(): Server {
        this.stop();

        const wss = new WS.Server({
            port: this.config.port,
            ...this.config.wsOptions,
        });
        this.wss = wss;
        this._isOnline = true;

        this.log(
            `SharedIO server running on port ${this.config.port}`,
        );

        this._serverStartTimestamp = this._lastTickTimestamp =
            new Date().getTime();

        this.tickIntervalRef = setInterval(
            this.tick,
            1000 / this.tickRate,
        );

        wss.on("connection", (ws) => this.handleNewConnection(ws));
        wss.on("close", () => this.handleServerStop(wss));

        return this;
    }

    /**
     * Closes the server and disconnects all users
     */
    stop(): Server {
        this._isOnline = false;
        this.wss?.close();
        clearInterval(this.tickIntervalRef);
        return this;
    }

    /**
     * This function is executed every server tick
     */
    private tick() {
        this._ticks++;
        this._lastTickTimestamp = new Date().getTime();
    }

    /**
     * This function is executed whenever a new client connects to the server
     */
    private handleNewConnection(ws: WS.WebSocket) {
        const newClient = new Client(ws, this, ({ token }) => {
            const newUser =
                User.auth(ws, this, token) ||
                new User(this, newClient);

            newUser.client.send({
                userId: newUser.id,
                token: newUser.token,
            });

            if (!this._users.filter((user) => user.is(newUser))[0]) {
                this._users.push(newUser);
            }

            return {
                close: () => {},
                message: (request) => {
                    this._config.on?.message?.(newUser, request);
                },
            };
        });
    }

    /**
     * This function is executed when the server stops
     */
    private handleServerStop(wss: WS.Server) {
        this._isOnline = false;
        wss.removeAllListeners();
        this.log("SharedIO server has stopped");
    }
}