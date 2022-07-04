import { Server } from "../../sharedio";
import { RawChannel } from "../../sharedio";
import { RawEntity } from "../../sharedio";
import { HasId, RandomHex, HasEvents, Mixin } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { ClientEmitterOverloads, ClientListenerOverloads } from "../../sharedio";
import { Input, PongInput, Output, Router } from "../../sharedio";
import { ConnectionInfo } from "./ConnectionInfo";
import WS from "ws";
class RawClient extends HasId {
    public get user() {
        return this._user;
    }
    public set user(newUser) {
        if (newUser && !this._user) {
            newUser.clients.add(this);
            this.send({
                type: "auth",
                data: {
                    userId: newUser.id,
                    token: newUser.token
                },
            });
            this._user = newUser;
        }
    }
    private _user: User|null = null;

    /**
     * Is this client associated with an user?
     */
    public get authenticated() {
        return !!this.user;
    }

    public get ws() {
        return this._ws;
    }
    private _ws: WS.WebSocket;

    public get server() {
        return this._server;
    }
    private _server: Server;

    /**
     * Verifies if the client is currently connected to the server
     */
    public get online() {
        return this._online;
    }
    private _online: boolean;

    private _connection: ConnectionInfo;

    /**
     * Gets the connection latency (in milliseconds)
     */
    public get ping() { return this._connection.ping };

    /**
     * Gets the packet loss ratio
     */
    public get packetLoss() { return this._connection.packetLoss };

    private _debugMode = false;

    constructor(ws: WS.WebSocket, server: Server) {
        super("RawClient");

        this._server = server;
        this._online = false;
        this._ws = ws;
        this._connection = new ConnectionInfo(this);

        this._ws?.removeAllListeners();
        ws.removeAllListeners();

        ws.on("message", (data) => {
            this.handleInput(data);
        });

        ws.on("open", () => {
            this.log("Connected");
            this._online = true;
        });

        ws.on("close", () => {
            this._online = false;
            this.emit("close");
            this._connection.stopPings();
            ws.removeAllListeners();
            this.log(`Disconnected`);
            this.user?.clients.remove(this);
        });

        this._connection.reset();

        this._online = ws.readyState === WS.OPEN;
        this._ws = ws;
    }

    private log(message: any) {
        if (this._debugMode) console.log(`[${this.id}] ${message}`);
    }

    public handleInput(data: WS.RawData) {
        const input: Input = JSON.parse(data.toString());

        switch (input.type) {
            case "auth": {
                this.server.auth(this, input.data.token);
                this._connection.sendPing();
                break;
            }
            case "pong": {
                this._connection.sendPing();
                break;
            }
            case "write":
            case "call": {
                this.server.router.handle(input, this);
                break;
            }
            default: {
                this.emit("message", { input });
                break;
            }
        }
    }

    /**
     * Sends a raw message to the client
     * @param message Message to be sent. It can be a string or a key-value object, which will be sent as JSON.
     */
    public sendRaw(message: KeyValue | string) {
        this.ws?.send(
            typeof message === "string"
                ? message
                : JSON.stringify(message),
        );
    }

    /**
     * Sends a message to the client
     * @param message Message to be sent. It has to be one of the possible SharedIO response types
     */
    public send(message: (Output|Omit<Output, "id">)&{client?: undefined, private?: undefined}) {
        delete (message as any).user;
        this.sendRaw({
            id: RandomHex(16),
            ...message
        });
    }
}

interface RawClient extends HasEvents {
    emit: ClientEmitterOverloads,
    on: ClientListenerOverloads
}

export class Client extends Mixin(RawClient, [HasEvents]) { };