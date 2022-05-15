import { ChannelListenerOverloads, ChannelEmitterOverloads, EntityConfig, KeyValue, EntityRolesInterface, EntityBuiltinRoleName, EntityAttributeName, EntitySchema } from "../types";
import { HasEvents, WatchedObject } from "../utils";
import { Mixin } from "../utils/Mixin";
import { Entity, SharedEntity } from "./Entity";
import { User, Queue } from ".";

export type EntityCreateFunction<EntityType extends Entity = Entity> = (type: new (config: EntityConfig<EntityType>) => EntityType, config?: EntityConfig<EntityType>, props?: KeyValue) => EntityType;

interface ChannelFunctions {
    create: EntityCreateFunction
}

class Channel extends Entity implements ChannelFunctions {
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
            this.emit("join", { user });
        }
    }

    public leave(user: User) {
        if (user.in(this)) {
            this._users = this._users.filter(currentUser => !currentUser.is(user));
            this.emit("leave", { user });
        }
    }

    /**
     * Creates a new entity inside this channel
     * @param type The class of the entity
     * @param config
     * @param props
     * @returns
     */
    public create<EntityType extends Entity>(type: new (config: EntityConfig<EntityType>) => EntityType, config: EntityConfig = {} as any, props: KeyValue = {}) {
        const newEntity = new type({
            ...config,
            channel: this as SharedChannel,
            server: this.server
        }) as EntityType;

        const created = newEntity.exists !== false;
        if (!created) {
            newEntity.delete();
        }

        // Generates schema
        (newEntity.constructor as any).schema as EntitySchema<EntityType>;

        this.server.entities.push(newEntity as SharedEntity);

        newEntity.emit("create", {
            entity: this,
            user: config.owner,
        });

        return WatchedObject(newEntity, {
            write(e) {
                console.log("write", e);
            },
            call(e) {
                console.log("call", e);
            }
        }, {
            exclude: Entity.reservedAttributes as (keyof EntityType)[]
        });
    }

    constructor(config: EntityConfig) {
        super(config);

        this._queue = new Queue(this);
    }
}

interface Channel extends HasEvents { }

/**
 * Channels are a special kind of entity that works as a subserver, being able to contain other entities (include other channels).
 *
 * Users must join a channel in order to be able to view or interact with the entities inside it.
 *
 * Every entity in the server must belong to one (and only one) channel, while users may be subscribed to multiple channels at the same time.
 */
class SharedChannel<Roles extends string[] = []> extends Mixin(Channel, [HasEvents]) { }

interface SharedChannel<Roles extends string[] = []> extends HasEvents {
    on: ChannelListenerOverloads<this>,
    emit: ChannelEmitterOverloads<this>,
    roles: EntityRolesInterface<Roles>
}

export { Channel, SharedChannel };