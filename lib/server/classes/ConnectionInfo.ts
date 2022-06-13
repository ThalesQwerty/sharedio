import { RandomHex } from "../../helpers";
import { PongInput } from "../types/Input";
import { Client } from "./Client";

const PING_SAMPLE_TIME = 1;

/**
 * Class specialized in obtaining the connection info for a given client connected to the server
 */
export class ConnectionInfo {
    public get server() {
        return this._client.server;
    }

    /**
    * Gets the connection latency (in milliseconds)
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
     * Gets the packet loss ratio
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

    constructor(private _client: Client) { }

    public reset() {
        this.stopPings();
        this._packetsSent = this._packetsReceived = 0;
        this._lastPings = [];
    }

    public startPings() {
        this._packetTimeout = setTimeout(() => {
            this.sendPing();
        }, PING_SAMPLE_TIME);
    }

    public stopPings() {
        if (this._packetTimeout)
            clearTimeout(this._packetTimeout);
    }

    /**
    * Sends a new "ping" message to the client and calculates the connection round trip time
    * @param pongRequest The pong sent by the client in response to the last packet
    */
    public sendPing(pongRequest?: PongInput) {
        const match = pongRequest?.data.packetId === this._currentPacketId;
        if (!pongRequest || match) {
            this._currentPacketId = RandomHex(8);
            if (match) {
                this._lastPings.push(this.server.time);
                this._packetsReceived++;
            }
        }

        this._client.send({
            type: "ping",
            id: this._currentPacketId,
            data: {
                packetId: this._currentPacketId,
                roundTripTime: this.ping,
                packetLossRatio: this.packetLoss,
            }
        });
        this._packetsSent++;

        if (this._packetTimeout) clearTimeout(this._packetTimeout);
        this._packetTimeout = setTimeout(() => {
            this.sendPing();
        }, PING_SAMPLE_TIME * 1000);
    }
}