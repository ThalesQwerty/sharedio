import {
    KeyValue,
    ServerConfig,
    ServerEvents,
    ServerEmitterOverloads,
    ServerListenerOverloads,
    ServerStartListener,
} from "../types";
import { User, Entity, Rules } from "../schema";
import { Queue } from "../schema/Queue";
import { Mixin } from "../utils/Mixin";
import { generateClientSchema } from "../scripts";
import { HasEvents, HasId } from "../utils";
import { SharedIORequest, Client } from ".";
import WS from "ws";

const DEFAULT_PORT = 3000;
const DEFAULT_TICK_RATE = 64;

class RawServer extends HasId {
    static current: RawServer;

    /**
     * Returns a dummy server for testing/mocking purposes
     */
    static get dummy() {
        if (!this._dummy) this._dummy = new RawServer();

        return this._dummy;
    }
    private static _dummy?: RawServer;

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

    public get queue() {
        return this._queue;
    }
    private _queue: Queue;

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

    public get entities() {
        return this._entities;
    }
    private _entities: Entity[] = [];

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
        super("RawServer");

        RawServer.current = this;

        config.port ??= DEFAULT_PORT;
        config.tickRate ??= DEFAULT_TICK_RATE;
        config.debug ??= false;

        this._config = config;
        this._queue = new Queue(this);
    }

    private log(message: any) {
        if (this._config.debug) console.log(message);
    }

    /**
     * Initializes the server
     */
    start(onStart?: ServerStartListener): RawServer {
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
            () => this.tick(),
            1000 / this.tickRate,
        );

        wss.on("connection", (ws) => this.handleNewConnection(ws));
        wss.on("close", () => this.handleServerStop(wss));

        this.on("start", () => {
            if (this.config.clientSchema) {
                generateClientSchema(
                    Rules.schema,
                    this.config.clientSchema,
                );
            } else {
                console.warn(`No client schema file is being generated.\nIf you want to automatically generate a schema file to be used in the client-side, use the "clientSchema" attribute of the server configuration.
                `);
            }
        });

        if (onStart) {
            this.on("start", onStart);
        }

        process.nextTick(() => {
            this.emit("start");
        });

        return this;
    }

    /**
     * Closes the server and disconnects all users
     */
    stop(): RawServer {
        this._isOnline = false;
        this.wss?.close();
        clearInterval(this.tickIntervalRef);
        return this;
    }

    /**
     * This function emits the tick event
     */
    private tick() {
        this._ticks++;

        this.entities.forEach((entity) => {
            Entity.emit(entity)("tick");
        });

        this.queue.broadcast();

        this.emit("nextTick");
        this.off("nextTick");

        this.emit("tick");

        this._lastTickTimestamp = new Date().getTime();
    }

    /**
     * This function is executed whenever a new client connects to the server
     */
    private handleNewConnection(ws: WS.WebSocket) {
        const newClient = new Client(ws, this);
        newClient.on("auth", ({ request }) => {
            const { token } = request;
            const newUser =
                User.auth(newClient, this, token) ||
                new User(this, newClient);

            newClient.user = newUser;

            if (!this._users.filter((user) => user.is(newUser))[0]) {
                this._users.push(newUser);
            }

            this.emit("connection", {
                user: newUser,
            });

            newClient.on("close", () => {
                this.emit("disconnection", {
                    user: newUser,
                });
                newUser.view.reset();
            });

            newClient.on("message", ({ request }) => {
                this.emit("message", request);
            });
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

    /**
     * Creates a new entity
     */
    public createEntity<T extends Entity>(
        Type: typeof Entity,
        initialState?: KeyValue,
        owner: User | null = null,
    ): T {
        const newEntity = new Type({
            server: this,
            initialState,
            owner,
        }) as T;
        this._entities.push(newEntity);

        return newEntity;
    }

    /**
     * Removes an entity from list
     */
    public removeEntity(
        entity: Entity
    ) {
        this._entities = this._entities.filter(
            (currentEntity) => !currentEntity.is(entity),
        );
    }
}

interface RawServer extends HasEvents {
    emit: ServerEmitterOverloads,
    on: ServerListenerOverloads
}

export class Server extends Mixin(RawServer, [HasEvents]) {};