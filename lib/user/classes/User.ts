import { ClientList, EntityAttributeName, KeyValue, Output, SerializedEntity, Server, UserRoles } from "../../sharedio";
import { Channel } from "../../sharedio";
import { Entity } from "../../sharedio";
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

    private _views: KeyValue<View, string> = {};

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
        this._action = new Action(this);
    }

    /**
     * What is this user currently viewing in a given channel?
     * @param channel
     */
    public getChannelView(channel: Channel): View|null {
        return this._views[channel.id] || null;
    }

    /**
     * How is this user currently viewing a given entity?
     * @param entity
     */
    public getEntityView(entity: Entity): SerializedEntity|null {
        const channelView = this.getChannelView(entity.channel);
        if (!channelView) return null;

        return channelView.current[entity.id];
    }

    /**
     * Sends an output to this user
     * @param output The output that will be sent as JSON
     * @param clients Specifies which ones of this user's clients should receive the output. If omitted, the output will be sent to all their clients.
     */
    public send(output: Output | Omit<Output, "id">, ...clients: Client[]) {
        if (output.type === "return") console.log("returning", output.data);

        if (!clients.length) {
            for (const client of this.clients) {
                const shouldSendOutput = !output.hidden?.client || (output.hidden?.private && client.is(output.hidden?.client)) || (!output.hidden?.private && !client.is(output.hidden?.client));
                if (shouldSendOutput) {
                    const serializedOutput = {...output, channel: output.channel.id, hidden: undefined };
                    delete serializedOutput.hidden;

                    client.send(serializedOutput);
                }
            }
        } else {
            for (const client of clients) {
                if (client.user?.is(this)) {
                    client.send(output);
                }
            }
        }
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

        user.addClient(client);
        return user;
    }

    private addClient(client: Client) {
        if (!this.clients.has(client)) {
            this.clients.add(client);

            for (const channel of this.channels) {
                this.getChannelView(channel)?.forceUpdate(client);
            }
        }
    }

    /**
     * Verifies if this user owns an entity
     */
    public owns(entity: Entity) {
        return entity.owner && this.is(entity.owner) ? true : false;
    }

    /**
     * Verifies if this user is inside a channel
     */
    public in(channel: Channel) {
        return !!channel.users.find(user => user.is(this));
    }

    /**
     * Gets the channels where this user is currently in
     */
    public get channels() {
        return this.server.channels.filter(channel => this.in(channel));
    }

    /**
     * Gets the roles of this user in a given entity
     */
    public roles<EntityType extends Entity>(
        entity: EntityType,
    ): string[] {
        return entity.roles.list(this);
    }

    /**
     * Attempts to join a channel and returns whether the attempt was successful or not.
     * @param channel
     */
    public join<ChannelType extends Channel>(
        channel: ChannelType
    ): boolean {
        const success = true;
        channel.join(this);

        if (success) {
            this._views[channel.id] = new View(this, channel);

            this.send({
                type: "join",
                channel,
                data: {}
            });
        }

        return success;
    }

    /**
     * Attempts to leave a channel and returns whether the attempt was successful or not.
     * @param channel
     */
    public leave<ChannelType extends Channel>(
        channel: ChannelType
    ): boolean {
        const success = true;
        channel.leave(this);

        if (success) {
            this.getChannelView(channel)?.destroy();

            this.send({
                type: "leave",
                channel,
                data: {}
            });
        }

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
    public can<EntityType extends Entity>(action: "input" | "output", entity: EntityType, attributeName: EntityAttributeName<EntityType>) {
        const userRoleCombinationId = entity.roles.combinationId(this);
        const attributeSchema = entity.schema.attributes[attributeName];

        return UserRoles.verifyCombination(action, userRoleCombinationId, attributeSchema);
    }
}
