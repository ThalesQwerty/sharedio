import { Channel, EntityCreateFunction, RawChannel } from "../../sharedio";
import { Entity, RawEntity, Schema } from "../../sharedio";
import { HasId, ObjectTransform, HasEvents, Mixin } from "../../sharedio";
import { User } from "../../sharedio";
import { ServerConfig } from "../../sharedio";
import { ServerStartListener, ServerEmitterOverloads, ServerListenerOverloads } from "../../sharedio";
import { Client } from "../../sharedio";
import WS from "ws";
import { Router } from "./Router";
import { EntityList } from "../../entity/classes/EntityList";

const DEFAULT_PORT = 3000;
const DEFAULT_SYNC_RATE = 64;

class RawServer extends HasId {
    static current: Server;

    /**
     * Returns a dummy server for testing/mocking purposes
     */
    static get dummy() {
        if (!this._dummy) this._dummy = new Server({ dummy: true });

        return this._dummy;
    }
    private static _dummy?: Server;

    private wss?: WS.Server;
    private tickIntervalRef: any = undefined;

    public get config() {
        return this._config;
    }
    private _config: ServerConfig;

    /**
     * The main channel of a server is the first channel every user joins automatically when they connect to the server. All entities on the server belong directly or indirectly to the main channel.
     */
    public get mainChannel() {
        return this._mainChannel;
    }
    private _mainChannel: Channel;

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

    public get entities() {
        return this._entities as EntityList<Entity>;
    }
    private _entities: EntityList;

    /**
     * How many tick events will happen per second
     */
    public get syncRate() {
        return this.config.syncRate ?? DEFAULT_SYNC_RATE;
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

    public get currentUser() {
        return this._currentUser;
    }
    public set currentUser(user) {
        this._currentUser = user;
        process.nextTick(() => {
            this._currentUser = null;
        });
    }
    private _currentUser: User | null = null;

    public get router() {
        return this._router;
    }
    private _router: Router;

    /**
     * Creates an entity inside the server's main channel
     */
    public get create() {
        const fn = <EntityType extends Entity = Entity>(...args: Parameters<EntityCreateFunction<EntityType>>) => {
            return (this.mainChannel.create as any)(...args) as EntityType;
        };

        return fn;
    }

    /**
     * Finds an entity by its ID
     * @param id Entity ID
     */
     public findEntity(id: string) {
        const ids = id.trim().split(Entity.ID_SEPARATOR).reduce((previousSteps, currentStep, index) => {
            return [...previousSteps, previousSteps[index - 1] ? `${previousSteps[index - 1] ?? ""}.${currentStep}` : currentStep]
        }, [] as string[]);

        if (ids[0] === this.mainChannel?.id) {
            ids.shift();
            let currentChild: RawEntity|null = null;

            for (const step of ids) {
                const parent: RawEntity = currentChild ?? this.mainChannel;

                if (parent instanceof RawChannel) {
                    const child = parent.entities.findById(step);
                    if (!child) break;

                    currentChild = child;
                } else {
                    break;
                }
            }

            return currentChild?.id === id ? currentChild as Entity : null;
        }

        return null;
    }

    constructor(config: ServerConfig = {}) {
        super("RawServer");

        Server.current = this;
        this._entities = new EntityList();
        this._router = new Router(this);

        config.port ??= DEFAULT_PORT;
        config.syncRate ??= DEFAULT_SYNC_RATE;
        config.debug ??= false;
        config.mainChannel ??= Channel;

        this._mainChannel = new config.mainChannel({ server: this, dummy: config.dummy }) as Channel;
        this._config = ObjectTransform.clone(config);
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
            () => this.sync(),
            1000 / this.syncRate,
        );

        wss.on("connection", (ws) => this.handleNewConnection(ws));
        wss.on("close", () => this.handleServerStop(wss));

        this.on("start", () => {
            if (this.config.clientSchema) {
                Schema.export(
                    this.config.clientSchema
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
    private sync() {
        this._ticks++;

        const channels: Channel[] = [];

        this.entities.forEach((entity) => {
            if (entity.exists) {
                // RawEntity.emit(entity)("tick");

                if (entity instanceof RawChannel) {
                    channels.push(entity as Channel);
                }
            }
        });

        channels.forEach((channel) => {
            RawChannel.getIOQueue(channel).sync();
        })

        this.emit("nextTick");
        this.off("nextTick");

        this.emit("tick");

        this._lastTickTimestamp = new Date().getTime();
    }

    /**
     * This function is executed whenever a new client connects to the server
     */
    private handleNewConnection(ws: WS.WebSocket) {
        new Client(ws, this);
    }

    public auth(client: Client, token: string|null) {
        const user = User.auth(client, this, token) || new User(this, client);

        if (user) {
            client.user = user;

            if (!this._users.find((user) => user.is(user))) {
                this._users.push(user);
                user.join(this.mainChannel);
            }

            this.emit("connection", {
                user,
                client
            });

            client.on("close", () => {
                this.emit("disconnection", {
                    user,
                    client
                });
                user.view.reset();
            });

            client.on("message", ({ input }) => {
                this.emit("message", {
                    user,
                    client,
                    message: input
                });
            });
        }
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
     * Removes an entity from list
     */
    public removeEntity(
        entity: RawEntity
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

export class Server extends Mixin(RawServer, [HasEvents]) { };