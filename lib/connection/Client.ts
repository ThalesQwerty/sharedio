import WS from "ws";
import { Server, Request, AuthRequest } from "./";
import { KeyValue } from "../utils";

export interface ClientListeners {
    auth?: (request: AuthRequest) => ClientListeners;
    message?: (request: Request) => void;
    close?: () => void;
}
export class Client {
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

    // public get ping() {
    //     return this._ping;
    // }
    // private _ping: number = 0;

    constructor(
        ws: WS.WebSocket,
        server: Server,
        auth: (request: AuthRequest) => ClientListeners,
    ) {
        this._listeners.auth = auth;
        this._server = server;
        this._online = false;
        this._ws = ws;
        this.reset(ws);
    }

    public reset(ws: WS.WebSocket) {
        this._ws?.removeAllListeners("message");

        ws.on("message", (data) => {
            this.recieve(data);
        });

        ws.on("open", () => {
            this._online = true;
        });

        ws.on("close", () => {
            this._online = false;
            this._listeners.close?.();
        });

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
                break;
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
}
