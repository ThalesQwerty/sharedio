import { ChannelListenerOverloads, ChannelEmitterOverloads } from "../types";
import { HasEvents } from "../utils";
import { Mixin } from "../utils/Mixin";
import { Entity } from "./Entity";
import { User } from "./User";

class Channel extends Entity {
    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    public get entities() {
        return this._entities;
    }
    private _entities: Entity[] = [];

    public join(user: User) {
        this._users.push(user);
    }

    public leave(user: User) {
        this._users = this._users.filter(currentUser => !currentUser.is(user));

        this.on("create", () => null);
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
class SharedChannel extends Mixin(Channel, [HasEvents]) {}

interface SharedChannel extends HasEvents {
    on: ChannelListenerOverloads<this>,
    emit: ChannelEmitterOverloads<this>
}

export { Channel, SharedChannel };