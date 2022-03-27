import { ChannelListenerOverloads, ChannelEmitterOverloads, EntityConfig, KeyValue, EntityRolesInterface } from "../types";
import { HasEvents } from "../utils";
import { Mixin } from "../utils/Mixin";
import { Entity } from "./Entity";
import { User, Queue } from ".";

class Channel extends Entity {
    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    public get entities() {
        return this._entities;
    }
    private _entities: Entity[] = [];

    public get queue() {
        return this._queue;
    }
    private _queue: Queue;

    public join(user: User) {
        if (!user.in(this)) {
            this._users.push(user);
            this.emit("join", {user});
        }
    }

    public leave(user: User) {
        if (user.in(this)) {
            this._users = this._users.filter(currentUser => !currentUser.is(user));
            this.emit("leave", {user});
        }
    }

    constructor(config: EntityConfig) {
        super(config);

        this._queue = new Queue(this);
    }
}

interface Channel extends HasEvents {}

/**
 * Channels are a special kind of entity that works as a subserver, being able to contain other entities (include other channels).
 *
 * Users must join a channel in order to be able to view or interact with the entities inside it.
 *
 * Every entity in the server must belong to one (and only one) channel, while users may be subscribed to multiple channels at the same time.
 */
class SharedChannel<Roles extends string[] = []> extends Mixin(Channel, [HasEvents]) {}

interface SharedChannel<Roles extends string[] = []> extends HasEvents {
    on: ChannelListenerOverloads<this>,
    emit: ChannelEmitterOverloads<this>,
    roles: EntityRolesInterface<Roles>["roles"]
}

export { Channel, SharedChannel };