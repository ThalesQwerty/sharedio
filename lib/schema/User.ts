import { HasId } from ".";
import { Server, Client } from "../connection";
import { RandomHex } from "../utils";
import WS from "ws";

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

    private _online: boolean = false;
    public get online() {
        return this._online;
    }

    /**
     * Attempts to use an access token to reconnect an user. Returns the user if successful, returns null otherwise.
     */
    public static auth(
        ws: WS.WebSocket,
        server: Server,
        token: string | null,
    ): User | null {
        const user = server.users.filter(
            (user) => user.token === token,
        )[0];
        if (!user) return null;

        user.client.reset(ws);
        return user;
    }

    constructor(server: Server, client: Client) {
        super();

        this._client = client;
        this._server = server;
        this._token = RandomHex();
    }
}
