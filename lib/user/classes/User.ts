import { ClientList, EntityAttributeName, Output, Server, UserRoles } from "../../sharedio";
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

    public send(output: Output | Omit<Output, "id">) {
        if (output.type === "return") console.log("returning", output.data);
        this.clients.forEach(client => {
            const shouldSendOutput = !output.client || (output.private && client.is(output.client)) || (!output.private && !client.is(output.client));
            if (shouldSendOutput) {
                client.send({ ...output, private: undefined, client: undefined });
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

    /**
     * Attempts to join a channel and returns whether the attempt was successful or not.
     * @param channel
     */
    public join<ChannelType extends RawChannel>(
        channel: ChannelType
    ): boolean {
        const success = true;
        channel.join(this);

        if (success) {
            for (const entity of channel.entities) {
                this.view.render(entity);
            }
        }

        this.view.update();

        return success;
    }

    /**
     * Attempts to leave a channel and returns whether the attempt was successful or not.
     * @param channel
     */
    public leave<ChannelType extends RawChannel>(
        channel: ChannelType
    ): boolean {
        const success = true;
        channel.leave(this);

        if (success) {
            for (const entity of channel.entities) {
                this.view.hide(entity);
            }
        }

        this.view.update();

        return success;
    }

    /**
     * Verifies whether or not this user has permission to perform a given action
     * @param action `"input"` if the user is trying to write a value into a property or call a method. `"output"` if the user is trying to read a property's value or listen to a method call event.
     * @param user  The user attempting to do the action.
     * @param enttiy The target entity.
     * @param attributeName The name of the attribute that would be read or written
     * @returns `true` if action would be allowed. `false` otherwise.
     */
    public can<EntityType extends RawEntity>(action: "input" | "output", entity: EntityType, attributeName: EntityAttributeName<EntityType>) {
        const userRoleCombinationId = entity.roles.combinationId(this);
        const attributeSchema = entity.schema.attributes[attributeName];

        return UserRoles.verifyCombination(action, userRoleCombinationId, attributeSchema);
    }
}
