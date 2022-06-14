import { ClientList, Output, Server } from "../../sharedio";
import { RawChannel } from "../../sharedio";
import { RawEntity } from "../../sharedio";
import { HasId, RandomHex } from "../../sharedio";
import { Client } from "../../sharedio";
import { Action } from "../../sharedio";
import { View } from "../../sharedio";

export class User extends HasId {
    /**
     * The websocket client associated with this user
     */
    public get clients() {
        return this._clients;
    }
    private _clients: ClientList;

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

    public get online() {
        return !this.clients.empty;
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

        this._clients = new ClientList(client);
        this._server = server;
        this._token = RandomHex();
        this._view = new View(this);
        this._action = new Action(this);
    }

    public send(output: Output|Omit<Output, "id">) {
        this.clients.forEach(client => {
            const shouldSendOutput = !output.client || (output.private && client.is(output.client)) || (!output.private && !client.is(output.client));
            if (shouldSendOutput) {
                client.send(output);
            }
        });
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

        user._clients.add(client);
        return user;
    }

    /**
     * Verifies if this user owns an entity
     */
    public owns(entity: RawEntity) {
        return entity.owner && this.is(entity.owner) ? true : false;
    }

    /**
     * Verifies if this user is inside a channel
     */
    public in(channel: RawChannel) {
        return !!channel.users.find(user => user.is(this));
    }

    /**
     * Gets the roles of this user in a given entity
     */
    public roles<EntityType extends RawEntity>(
        entity: EntityType,
    ): string[] {
        return entity.roles.list(this);
    }
}
