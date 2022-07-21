import { Client, EntityAttributeName, HasId, Server } from "../../sharedio";
import { Channel } from "../../sharedio";
import { HasEvents, Mixin } from "../../sharedio";
import { SharedIOError } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { EntityConfig } from "../../sharedio";
import { EntityEmitterOverloads, EntityEvents, EntityListenerOverloads } from "../../sharedio";
import { EntityRolesData, EntityRolesInterface } from "../../sharedio";
import { EntitySchema } from "../../sharedio";
import { EntityStaticMembers } from "./EntityStaticMembers";
import { UserRoles, Schema } from "../../sharedio";
interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

class RawEntity
    extends EntityStaticMembers
    implements EntityReservedAttributes {

    public static emit(
        entity: RawEntity,
    ):
        | EntityEmitterOverloads
        | ((
            event: keyof EntityEvents,
            props?: KeyValue<any, string | number | symbol>,
        ) => void) {
        return entity.emit;
    }

    public static get schema(): EntitySchema {
        return this._schema ?? (this._schema = Schema.generate(this));
    }
    private static _schema?: EntitySchema;

    /**
     * Entity class name
     */
    public get type() {
        return this.constructor.name;
    }

    public readonly owned: undefined;

    /**
     * Returns the user who created this entity
     *
     * Returns null if it has been created by the server
     */
    public get owner() {
        return this._owner;
    }
    private _owner: User | null = null;

    /**
     * Which server is this entity in?
     */
    public get server() {
        return this.channel.server;
    }

    /**
     * In which channel is this entity in?
     */
    public get channel(): Channel {
        return this._channel as Channel;
    }
    private _channel: Channel;

    /**
     * Does this entity exist or has it been deleted?
     */
    public get exists() {
        return this._exists;
    }
    private _exists: boolean|null = null;

    /**
     * The user who's curently using the entity
     */
    public get user() {
        return this._user;
    }
    private _user: User|null = null;

    private _roles: EntityRolesData = {
        lists: {},
        binary: {}
    };
    public readonly roles = UserRoles.apply(this, this._roles);

    public get schema(): EntitySchema<this> {
        return (this.constructor as typeof RawEntity).schema as EntitySchema<this>;
    }

    constructor({ channel, initialState, owner, dummy = false }: EntityConfig) {
        super("Entity", 8);

        if (dummy) {
            this._channel = undefined as any;
            this._owner = owner ?? null;

            // Disables event listeners for dummy entities
            this.on = (event: any, callback: any) => this;
            this.off();

            return this;
        }

        this._channel = channel;
        this._owner = owner ?? null;

        do {
            var newId = `Entity_${this.type}`;
        } while (this.channel.findEntity(newId));

        HasId.reset(this, newId, 16, "_");

        process.nextTick(() => {
            const created = this.exists !== false;
            if (!created) {
                this.delete();
                return;
            }

            this._exists = true;

            Channel.getIOQueue(this.channel).addEntity(this);
        });

        return Channel.setupProxy(this.channel, this);
    }

    /**
     * Verifies if the entity is in a given channel
     */
    public in(channel: Channel) {
        return this.channel.is(channel);
    }

    /**
     * Use this method to initialize the entity
     */
    public $init(config: EntityConfig) {}

    /**
     * Deletes this entity
     *
     * @param user Who is trying to delete? (`null`, if entity is being deleted by the server)
     */
    public delete(user: User | null = null) {
        if (this.exists !== false && this.emit("canDelete?", ({ entity: this, user }))) {
            this.channel.entities.remove(this);
            this._exists = false;
            process.nextTick(() => {
                this.off();
            });

            if (this._exists == null) {
                this.emit("failedCreate", {
                    entity: this,
                    user: this.owner,
                });
            }
            else {
                Channel.getIOQueue(this.channel).removeEntity(this);
                this.emit("delete", {
                    entity: this,
                    user: this.owner
                });
            }

            this._channel.entities.remove(this);

            return true;
        }
    }
}

interface RawEntity extends HasEvents {
    on: EntityListenerOverloads<this>,
    emit: EntityEmitterOverloads<this>
}

interface Entity extends HasEvents {
    on: EntityListenerOverloads<this>,
    emit: EntityEmitterOverloads<this>,

    /**
     * User roles are used to determine how each user will be able to view and interact with entities.
     *
     * Depending on the roles a given user has, they may have full access (input), readonly access (output) or no access at all (hidden) to certain properties and methods.
     *
     * Be aware that user roles are NOT global. Each entitiy/channel has their own possible roles for users.
     */
    roles: EntityRolesInterface
}

class Entity extends Mixin(RawEntity, [HasEvents]) { }

export { Entity };