import { Entity, HasId } from ".";
import { Server, Client } from "../connection";
import { KeyValue, RandomHex, Difference } from "../utils";
import WS from "ws";

import * as _ from "lodash";

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

    private _currentView: KeyValue = {};
    private _newView: KeyValue = {};

    /**
     * Attempts to use an access token to reconnect an user. Returns the user if successful, returns null otherwise.
     */
    public static auth(
        client: Client,
        server: Server,
        token: string | null,
    ): User | null {
        const user = server.users.filter(
            (user) => user.token === token,
        )[0];
        if (!user) return null;

        user._client = client;
        return user;
    }

    constructor(server: Server, client: Client) {
        super("User");

        this._client = client;
        this._server = server;
        this._token = RandomHex();
    }

    public snapshot() {
        this.resetView();
        this.server.entities.forEach(entity => {
            this._newView[entity.id] = Entity.serialize(entity);
        })

        const difference = Difference(this._currentView, this._newView);

        if (difference.add || difference.remove) {
            this.client.send({
                action: "view",
                ...difference
            })
        }

        this._currentView = _.cloneDeep(this._newView);
    }

    public resetView() {
        this._newView = {};
    }
}
