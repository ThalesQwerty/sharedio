import { EntityAttributeName, EntityConstructor } from "../../entity";
import { EntityList } from "../../entity/classes/EntityList";
import { Entity, EntityConfig, EntitySchema, WatchedObject, EntityRolesInterface, HasId, Server, ChannelConfig, ChannelList, Clock } from "../../sharedio";
import { ObjectTransform, HasEvents, Mixin } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { ChannelListenerOverloads, ChannelEmitterOverloads, Queue } from "../../sharedio";

const DEFAULT_SYNC_RATE = 64;
class RawChannel extends HasId {

    public static getIOQueue<ChannelType extends RawChannel>(channel: ChannelType) {
        return channel._queue;
    }

    /**
     * Configures the I/O queue of a channel to watch an entity for future updates
     */
    public static setupProxy<ChannelType extends RawChannel, EntityType extends Entity>(channel: ChannelType, entity: EntityType): EntityType {
        return WatchedObject(entity, {
            write: ({ propertyName, previousValue, attemptedValue, value }) => {
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
                            entity: entity.id,
                            properties: {
                                [propertyName]: value
                            }
                        },
                        channel,
                        hidden: {
                            client: (!shouldSendToAuthor && Entity.lastClient) || undefined
                        }
                    });
                }
            },
            call: ({ methodName, parameters }) => {
                const schema = entity.schema.attributes[methodName as EntityAttributeName<EntityType>];

                if (!schema.async) {
                    channel._queue.addOutput({
                        type: "call",
                        data: {
                            entity: entity.id,
                            methodName: methodName,
                            parameters: parameters
                        },
                        channel,
                        hidden: {
                            client: Entity.lastClient || undefined
                        }
                    });
                }
            }
        }, {
            exclude: Entity.reservedAttributes as (keyof EntityType)[]
        });
    }

    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    public get entities() {
        return this._entities;
    }
    private _entities: EntityList = new EntityList();

    private _queue: Queue;

    /**
     * Entity class name
     */
    public get type() {
        return this.constructor.name;
    }

    /**
     * Which server is this channel from?
     */
    public get server() {
        return this._server;
    }
    private _server: Server;

    /**
     * Channel's internal clock, responsible for calling the `$sync()` function periodically
     */
    public get $clock() {
        return this._$clock;
    }
    private _$clock: Clock;

    /**
     * Attempts to find an entity inside this channel by its ID
     */
    public get findEntity() {
        return this._entities.findById.bind(this._entities);
    }

    constructor(config: ChannelConfig) {
        super("Channel");

        this._server = config.server;
        this._queue = new Queue(this);

        this.server.channels[this.type] ??= new ChannelList<this>();
        this.server.channels[this.type].push(this);

        do {
            var newId = `Channel_${this.type}`;
        } while (this.server.findChannel(newId));

        HasId.reset(this, newId, 16, "_");

        this._$clock = new Clock(
            () => { 
                this.$sync(); 
            }, 
            config.syncRate ?? DEFAULT_SYNC_RATE
        ).start(true);
    }

    /**
     * This method is called periodically in order to synchronize this channel's entities state with the users connected.
     */
    public $sync() {
        this._queue.sync();
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
    public createEntity<EntityType extends Entity = Entity>(type: EntityConstructor<EntityType>, config: Omit<EntityConfig<EntityType>, "channel"> = {}): EntityType {
        return new type({
            ...config,
            channel: this
        });
    }
}

interface RawChannel extends HasEvents {
    on: ChannelListenerOverloads<this>,
    emit: ChannelEmitterOverloads<this>,
    roles: EntityRolesInterface
}

/**
 * Channels are a special kind of entity that works as a subserver, being able to contain other entities (include other channels).
 *
 * Users must join a channel in order to be able to view or interact with the entities inside it.
 *
 * Every entity in the server must belong to one (and only one) channel, while users may be subscribed to multiple channels at the same time.
 */
class Channel extends Mixin(RawChannel, [HasEvents]) { }

export { Channel };