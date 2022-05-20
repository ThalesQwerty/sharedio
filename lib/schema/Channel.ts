import { ChannelListenerOverloads, ChannelEmitterOverloads, EntityConfig, KeyValue, EntityRolesInterface, EntityBuiltinRoleName, EntityAttributeName, EntitySchema } from "../types";
import { HasEvents, ObjectTransform, RandomHex, WatchedObject } from "../utils";
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
            write: ({ propertyName, previousValue, attemptedValue, value}) => {
                // TO-DO: allow computed property binding
                /*
                    const propertySchema = newEntity.schema.attributes[e.propertyName as EntityAttributeName<EntityType>];

                    for (const dependency of propertySchema.dependencies) {

                    }
                */

                /*
                    If the "set" mutator of the property alters the value that would be written into the property,
                    the server should also send to the author the new value.

                    Otherwise, it will be sent to everyone in the channel except for the author of the change in order
                    to avoid unnecessary latency issues, since they know the new value already.
                 */
                const shouldSendToAuthor = (typeof value !== typeof attemptedValue) || (value instanceof Object ? !ObjectTransform.isEqual(value, attemptedValue) : value !== attemptedValue);

                this.queue.addOutput({
                    type: "write",
                    data: {
                        entityId: newEntity.id,
                        properties: {
                            [propertyName]: value
                        }
                    },
                    user: shouldSendToAuthor ? null : this.server.currentUser
                });
            },
            call: ({ methodName, parameters }) => {
                this.queue.addOutput({
                    type: "call",
                    data: {
                        entityId: newEntity.id,
                        methodName: methodName,
                        parameters: parameters
                    },
                    user: this.server.currentUser
                })
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