import WS from "ws";
import { Server, Request, AuthRequest, PongRequest } from "./";
import { KeyValue, RandomHex } from "../utils";
import { HasId } from "../schema/HasId";

const PING_SAMPLE_TIME = 1;

export interface ClientListeners {
    auth?: (request: AuthRequest) => ClientListeners;
    message?: (request: Request) => void;
    pong?: (request: PongRequest) => void;
    close?: () => void;
}
export class Client extends HasId {
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
     * List of event listeners for different types of messages received
     */
    private _listeners: ClientListeners = {};

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
        auth: (request: AuthRequest) => ClientListeners,
    ) {
        super("Client");
        this._listeners.auth = auth;
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
            this._listeners.close?.();
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
        const request: Request = JSON.parse(data.toString());

        switch (request.action) {
            case "auth": {
                const newListeners = this._listeners.auth?.(
                    request as AuthRequest,
                );
                this._listeners = {
                    ...this._listeners,
                    ...newListeners,
                };
                this.sendPing();
                break;
            }
            case "pong": {
                this.sendPing(request as PongRequest);
            }
            default: {
                this._listeners.message?.(request);
                break;
            }
        }
    }

    public send(message: KeyValue | string) {
        this.ws?.send(
            typeof message === "string"
                ? message
                : JSON.stringify(message),
        );
    }

    private sendPing(pong?: PongRequest, reset = false) {
        const match = pong?.packetId === this._currentPacketId;
        if (reset || match) {
            this._currentPacketId = RandomHex(8);
            if (match) {
                this._lastPings.push(this.server.time);
                this._packetsReceived++;
            }
        }

        this.log(`Sending ping: ${this._currentPacketId}`);

        // this.send({
        //     action: "ping",
        //     packetId: this._currentPacketId,
        //     roundTripTime: this.ping,
        //     packetLossRatio: this.packetLoss,
        // });
        this._packetsSent++;

        if (this._packetTimeout) clearTimeout(this._packetTimeout);
        this._packetTimeout = setTimeout(() => {
            this.sendPing(undefined, true);
        }, PING_SAMPLE_TIME * 1000);
    }
}
