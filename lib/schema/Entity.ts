import { Channel, User } from ".";
import { Server } from "../connection/Server";
import {
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads,
    KeyValue,
    EntityCreateListener,
    EntityConfig,
    EntityFailedCreateListener,
    EntityAttributeName,
    SharedIOError,
    EntityState,
    EntitySchema,
    EntityChangeEvent,
    EntityRolesInterface,
    EntityRolesData,
} from "../types";
import { HasEvents, ObjectTransform, WatchedObject } from "../utils";
import { Mixin } from "../utils/Mixin";
import "reflect-metadata";

import * as _ from "lodash";
import { SharedChannel } from "./Channel";
import { UserRoles } from "./Roles";
import { Schema } from "./Schema";
import { EntityStaticMembers } from "./EntityStaticMembers";

interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

class Entity
    extends EntityStaticMembers
    implements EntityReservedAttributes {

    public static emit(
        entity: Entity,
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

    constructor({ server, channel, initialState, owner, dummy = false }: EntityConfig) {
        super("Entity");

        if (dummy) {
            this._channel = undefined as any;
            this._server = undefined as any;
            this._owner = owner ?? null;

            // Disables event listeners for dummy entities
            this.on = (event: any, callback: any) => undefined;
            this.off();

            return this;
        }

        channel ??= server?.mainChannel;
        server ??= channel?.server;

        this._channel = (channel ?? server?.mainChannel) as SharedChannel;
        this._server = (server ?? channel?.server) as Server;
        this._owner = owner ?? null;

        process.nextTick(() => {
            const created = this.exists !== false;
            if (!created) {
                this.delete();
                return;
            }

            this._channel ??= (this._server?.mainChannel) as SharedChannel;
            this._server ??= (this._channel?.server) as Server;

            if (!this._channel || !this._server) throw new SharedIOError("serverAndChannelUndefined");

            this._exists = true;
        });
    }

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
     * In which server is this entity in?
     */
    public get server() {
        return this._server;
    }
    private _server: Server;

    /**
     * In which channel is this entity in?
     */
    public get channel(): SharedChannel {
        return this._channel as SharedChannel;
    }
    private _channel: Channel;

    /**
     * Does this entity exist or has it been deleted?
     */
    public get exists() {
        return this._exists;
    }
    private _exists: boolean|null = null;

    private _roles: EntityRolesData = {
        lists: {},
        binary: {}
    };
    public readonly roles = UserRoles.apply(this, this._roles);

    public get schema(): EntitySchema<this> {
        return (this.constructor as typeof Entity).schema as EntitySchema<this>;
    }

    /**
     * Deletes this entity
     *
     * @param user Who is trying to delete? (`null`, if entity is being deleted by the server)
     */
    public delete(user: User | null = null) {
        if (this.exists !== false && this.emit("canDelete?", ({ entity: this, user }))) {
            this.server.removeEntity(this as Entity);
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
                this.emit("delete", {
                    entity: this,
                    user: this.owner
                });
            }

            return true;
        }
    }
}

interface Entity extends HasEvents { }

interface SharedEntity<Roles extends string[] = []> extends HasEvents {
    on: EntityListenerOverloads<this>,
    emit: EntityEmitterOverloads<this>,

    /**
     * User roles are used to determine how each user will be able to view and interact with entities.
     *
     * Depending on the roles a given user has, they may have full access (input), readonly access (output) or no access at all (hidden) to certain properties and methods.
     *
     * Be aware that user roles are NOT global. Each entitiy/channel has their own possible roles for users.
     */
    roles: EntityRolesInterface<Roles>
}

class SharedEntity<Roles extends string[] = []> extends Mixin(Entity, [HasEvents]) { }

export { Entity, SharedEntity };