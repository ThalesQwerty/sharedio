import { Channel, ChannelList, KeyValue, ChannelConfig, ChannelConstructor } from "../../sharedio";
import { Entity, Schema } from "../../sharedio";
import { HasId, ObjectTransform, HasEvents, Mixin } from "../../sharedio";
import { User } from "../../sharedio";
import { ServerConfig } from "../../sharedio";
import { ServerStartListener, ServerEmitterOverloads, ServerListenerOverloads } from "../../sharedio";
import { Client } from "../../sharedio";
import WS from "ws";
import { Router } from "./Router";
import { EntityList } from "../../entity/classes/EntityList";

const DEFAULT_PORT = 3000;
class RawServer extends HasId {
    static current: Server;

    /**
     * Creates a dummy server exclusively for testing/mocking purposes
     */
    static dummy(config?: Partial<ServerConfig>) {
        return new Server({ ...config, dummy: true });
    }

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
     * Lists all channels, separated by type, that exists in this server
     */
    public get channelsByType() {
        return this._channelsByType;
    }
    private _channelsByType: KeyValue<ChannelList, string>;

    /**
     * Lists all channels that exists in this server
     */
    public get channels() {
        return new ChannelList(...Object.keys(this.channelsByType).reduce<Channel[]>((list, type) => [...list, ...this.channelsByType[type]], []));
    }

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

    // public get currentUser() {
    //     return this._currentUser;
    // }
    // public set currentUser(user) {
    //     this._currentUser = user;
    //     process.nextTick(() => {
    //         this._currentUser = null;
    //     });
    // }
    // private _currentUser: User | null = null;

    public get router() {
        return this._router;
    }
    private _router: Router;

    constructor(config: ServerConfig = {}) {
        super("RawServer");

        Server.current = this;
        this._channelsByType = {};
        this._router = new Router(this);

        config.port ??= DEFAULT_PORT;
        config.debug ??= false;

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
     * Finds a channel on this server by its ID. Returns `undefined` if it couldn't be found.
     * @param id The ID to look for
     */
    findChannel<ChannelType extends Channel = Channel>(id: string): ChannelType | undefined {
        const [_, type] = id.split("_");

        return this.channelsByType[type]?.findById(id) as ChannelType;
    }

    /**
     * Creates a new channel in this server
     */
    createChannel<ChannelType extends Channel = Channel>(type: ChannelConstructor<ChannelType>, config: Omit<ChannelConfig<ChannelType>, "server"> = {}): ChannelType {
        return new type({
            ...config,
            server: this
        })
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
     * This function is executed whenever a new client connects to the server
     */
    private handleNewConnection(ws: WS.WebSocket) {
        new Client(ws, this);
    }

    public auth(client: Client, token: string | null) {
        const user = User.auth(client, this, token) || new User(this, client);

        console.log("auth", token, user.id);

        if (user) {
            client.user = user;

            if (!this._users.find((existingUser) => existingUser.is(user))) {
                this._users.push(user);
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
                // to-do: reset user views
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
}

interface RawServer extends HasEvents {
    emit: ServerEmitterOverloads,
    on: ServerListenerOverloads
}

export class Server extends Mixin(RawServer, [HasEvents]) { };