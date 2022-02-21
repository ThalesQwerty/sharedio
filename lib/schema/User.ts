import { Entity, View, Action } from ".";
import { Server, Client } from "../connection";
import { RandomHex, HasId } from "../utils";
import * as _ from "lodash";
import { EntityUserRelation } from '../types';

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

    public get view() {
        return this._view;
    }
    private _view: View;

    /**
     * Attemtps to execute an action as this user
     */
    public get action() {
        return this._action;
    }
    private _action: Action;

    constructor(server: Server, client: Client) {
        super("User");

        this._client = client;
        this._server = server;
        this._token = RandomHex();
        this._view = new View(this);
        this._action = new Action(this);
    }

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

    /**
     * Verifies if this user owns an entity
     */
    public owns(entity: Entity) {
        return entity.owner && this.is(entity.owner) ? true : false;
    }

    /**
     * In which categories does this user fall in relation to an entity?
     */
    public relations(entity: Entity): EntityUserRelation[] {
        const relations:EntityUserRelation[] = [];

        if (this.owns(entity)) relations.push("owner");
        // to-do: host and insider

        return relations;
    }
}
