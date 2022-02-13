import WS from "ws";
import { Server, SharedIORequest, SharedIOResponse, PongRequest } from "./";
import { RandomHex } from "../utils";
import { KeyValue, ClientEvents, ClientListenerOverloads, ClientEmitterOverloads} from "../types";
import { HasEvents } from "../utils";

const PING_SAMPLE_TIME = 1;
export class Client extends HasEvents<ClientEvents, ClientListenerOverloads, ClientEmitterOverloads> {
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

    /**
     * Calculates the connection latency (in microseconds)
     */
    public get ping() {
        this._lastPings = this._lastPings.filter(
            (time) => time >= this.server.time - PING_SAMPLE_TIME,
        );
        const numPings = this._lastPings.length;
        if (!numPings) return 1000 * PING_SAMPLE_TIME - 1;

        const latency =
            1000 * (this.server.time - this._lastPings[0]);
        return Math.round(latency / numPings);
    }

    /**
     * Calculates the packet loss ratio
     */
    public get packetLoss() {
        if (!this._packetsSent) return 0;
        if (!this._packetsReceived) return 1;
        return 1 - this._packetsReceived / this._packetsSent;
    }

    private _lastPings: number[] = [];
    private _currentPacketId: string = "";
    private _packetsSent: number = 0;
    private _packetsReceived: number = 0;
    private _packetTimeout?: NodeJS.Timeout;

    private _debugMode = false;

    constructor(
        ws: WS.WebSocket,
        server: Server,
    ) {
        super("Client");
        this._server = server;
        this._online = false;
        this._ws = ws;
        this.reset(ws);
    }

    private log(message: any) {
        if (this._debugMode) console.log(`[${this.id}] ${message}`);
    }

    public reset(ws: WS.WebSocket) {
        this._ws?.removeAllListeners();
        ws.removeAllListeners();

        ws.on("message", (data) => {
            this.recieve(data);
        });

        ws.on("open", () => {
            this.log("Connected");
            this._online = true;
        });

        ws.on("close", () => {
            this._online = false;
            this.emit("close");
            if (this._packetTimeout)
                clearTimeout(this._packetTimeout);
            ws.removeAllListeners();
            this.log(`Disconnected`);
        });

        if (this._packetTimeout) clearTimeout(this._packetTimeout);
        this._packetsSent = this._packetsReceived = 0;
        this._lastPings = [];

        this._online = ws.readyState === WS.OPEN;
        this._ws = ws;
    }

    public recieve(data: WS.RawData) {
        const request: SharedIORequest = JSON.parse(data.toString());

        switch (request.action) {
            case "auth": {
                this.emit("auth", {
                    request: request,
                });
                this.sendPing();
                break;
            }
            case "pong": {
                this.sendPing(request);
                break;
            }
            case "write": {
                console.log("write", request);
            }
            default: {
                this.emit("message", {request});
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
    public send(message: SharedIOResponse) {
        this.sendRaw(message);
    }

    /**
     * Sends a new "ping" message to the client and calculates the connection round trip time
     * @param pongRequest The pong sent by the client in response to the last packet
     */
    private sendPing(pongRequest?: PongRequest) {
        const match = pongRequest?.packetId === this._currentPacketId;
        if (!pongRequest || match) {
            this._currentPacketId = RandomHex(8);
            if (match) {
                this._lastPings.push(this.server.time);
                this._packetsReceived++;
            }
        }

        this.log(`Sending ping: ${this._currentPacketId}`);

        this.send({
            action: "ping",
            packetId: this._currentPacketId,
            roundTripTime: this.ping,
            packetLossRatio: this.packetLoss,
        });
        this._packetsSent++;

        if (this._packetTimeout) clearTimeout(this._packetTimeout);
        this._packetTimeout = setTimeout(() => {
            this.sendPing();
        }, PING_SAMPLE_TIME * 1000);
    }
}
