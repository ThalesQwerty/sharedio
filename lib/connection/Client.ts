import WS from "ws";
import { Server } from "./";
import { KeyValue } from "../utils";

export class Client {
    ws: WS.WebSocket;
    server: Server;

    constructor(ws: WS.WebSocket, server: Server) {
        this.ws = ws;
        this.server = server;

        ws.on("message", this.recieve);
    }

    public recieve(data: WS.RawData) {
        console.log(`Message received: ${data}`);
    }

    public send(message: KeyValue | string) {
        this.ws?.send(
            typeof message === "string"
                ? message
                : JSON.stringify(message),
        );
    }
}
