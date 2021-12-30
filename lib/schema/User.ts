import { HasId } from ".";
import { Client, Server } from "../connection";
import { RandomHex } from "../utils";

export class User extends HasId {
    /**
     * The websocket client associated with this user
     */
    public get client() {
        return this._client;
    }
    private _client: Client;

    /**
     * The server where this user is connected
     */
    public get server() {
        return this._server;
    }
    private _server: Server;

    /**
     * Secret access token that can be used by the user to reconnect without reseting their current state in the server
     */
    public get token() {
        return this._token;
    }
    private _token: string;

    constructor(client: Client, server: Server) {
        super();

        this._client = client;
        this._server = server;
        this._token = RandomHex();
    }
}
