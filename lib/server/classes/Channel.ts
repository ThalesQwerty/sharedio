import { EntityAttributeName, EntityConstructor } from "../../entity";
import { EntityList } from "../../entity/classes/EntityList";
import { RawEntity, Entity, EntityConfig, EntitySchema, WatchedObject, EntityRolesInterface } from "../../sharedio";
import { ObjectTransform, HasEvents, Mixin } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { ChannelListenerOverloads, ChannelEmitterOverloads, Queue } from "../../sharedio";

export type EntityCreateFunction<EntityType extends Entity = Entity> = (type: EntityConstructor<EntityType>, config?: EntityConfig<EntityType>, props?: KeyValue) => EntityType;

interface ChannelFunctions {
    create: EntityCreateFunction
}

class RawChannel extends RawEntity implements ChannelFunctions {
    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    public get entities() {
        return this._entities;
    }
    private _entities: EntityList = new EntityList();

    public static getIOQueue<ChannelType extends RawChannel>(channel: ChannelType) {
        return channel._queue;
    }
    private _queue: Queue;

    /**
     * Configures the I/O queue of a channel to watch an entity for future updates
     */
    public static setupProxy<ChannelType extends RawChannel, EntityType extends RawEntity>(channel: ChannelType, entity: EntityType) {
        return WatchedObject(entity, {
            write: ({ propertyName, previousValue, attemptedValue, value}) => {
                // TO-DO: allow computed property binding
                /*
                    const propertySchema = entity.schema.attributes[e.propertyName as EntityAttributeName<EntityType>];

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
                const schema = entity.schema.attributes[propertyName as EntityAttributeName<EntityType>];

                if (!schema.async) {
                    channel._queue.addOutput({
                        type: "write",
                        data: {
                            entityId: entity.id,
                            properties: {
                                [propertyName]: value
                            }
                        },
                        client: (!shouldSendToAuthor && Entity.lastClient) || undefined
                    });
                }
            },
            call: ({ methodName, parameters }) => {
                const schema = entity.schema.attributes[methodName as EntityAttributeName<EntityType>];

                if (!schema.async) {
                    channel._queue.addOutput({
                        type: "call",
                        data: {
                            entityId: entity.id,
                            methodName: methodName,
                            parameters: parameters
                        },
                        client: Entity.lastClient || undefined
                    });
                }
            }
        }, {
            exclude: RawEntity.reservedAttributes as (keyof EntityType)[]
        });
    }

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
    public create<EntityType extends RawEntity>(type: new (config: EntityConfig<EntityType>) => EntityType, config: EntityConfig = {} as any, props: KeyValue = {}): EntityType {
        const newConfig = {
            ...config,
            channel: this as Channel,
            server: this.server
        };

        const newEntity = new type(newConfig) as EntityType;

        // Generates schema
        (newEntity.constructor as any).schema as EntitySchema<EntityType>;

        const entityProxy = Channel.setupProxy(this, newEntity);

        entityProxy.$init(newConfig);

        this.server.entities.push(entityProxy as Entity);
        if (newEntity instanceof RawChannel) this.server.channels.push(entityProxy as any as Channel);
        this.entities.push(entityProxy as Entity);

        // const created = entityProxy.exists !== false;
        // if (!created) {
        //     entityProxy.delete();
        // }

        console.log("entities", this.server.entities.map(e => e.id));

        entityProxy.emit("create", {
            entity: this,
            user: config.owner,
        });

        return entityProxy;
    }

    constructor(config: EntityConfig) {
        super(config);

        this._queue = new Queue(this);
    }
}

interface RawChannel extends HasEvents { }

/**
 * Channels are a special kind of entity that works as a subserver, being able to contain other entities (include other channels).
 *
 * Users must join a channel in order to be able to view or interact with the entities inside it.
 *
 * Every entity in the server must belong to one (and only one) channel, while users may be subscribed to multiple channels at the same time.
 */
class Channel<Roles extends string[] = []> extends Mixin(RawChannel, [HasEvents]) { }

interface Channel<Roles extends string[] = []> extends HasEvents {
    on: ChannelListenerOverloads<this>,
    emit: ChannelEmitterOverloads<this>,
    roles: EntityRolesInterface<Roles>
}

export { RawChannel, Channel };