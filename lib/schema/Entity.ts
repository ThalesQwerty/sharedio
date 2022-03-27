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
} from "../types";
import { HasEvents, ObjectTransform, WatchObject } from "../utils";
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
        return Schema.generate(this, this._schema);
    }
    private static _schema?: EntitySchema;

    constructor({ server, channel, initialState, owner, dummy = false }: EntityConfig) {
        super("Entity");

        if (dummy) {
            server = Server.dummy;
            channel = Server.dummy.mainChannel;

            // Disables event listeners for dummy entities
            this.on = (event: any, callback: any) => undefined;
            this.off();
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

            const attributeList = Entity.attributes(this);
            WatchObject(
                this,
                this.state,
                "data",
                ({ path, newValue }) => {
                    console.log("setting", this.type, path, newValue);
                    ObjectTransform.set(this.state.changes, path, newValue);
                    this.state.emitChanges();
                },
                attributeList
            )

            const schema = (this.constructor as any).schema as EntitySchema<this>;

            if (schema) {
                for (const attributeName in schema.attributes) {
                    if (attributeName in this) {
                        const rules = schema.attributes[attributeName as EntityAttributeName<this>];

                        if (rules.type !== "function") {
                            this.state.data[attributeName as EntityAttributeName<this>] = rules.initialValue;

                            if (rules && rules.dependencies.length) {
                                this.bind(attributeName, rules.dependencies);
                            }

                            if (initialState) {
                                const value = (initialState as any)[
                                    attributeName
                                ];
                                if (value !== undefined)
                                    (this as any)[attributeName] = value;
                            }
                        }
                    }
                }
            }

            this._server.entities.push(this as SharedEntity);

            this.emit("create", {
                entity: this,
                user: owner,
            });
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

    private readonly state: EntityState<this> = {
        data: {},
        changes: {},
        hasChanges: false,
        emitChanges: () => {
            this.state.hasChanges = true;

            process.nextTick(() => {
                if (this.state.hasChanges) {
                    this.emit("change", {
                        entity: this,
                        changes: ObjectTransform.clone(this.state.changes)
                    });

                    this.channel.queue.add(this as Entity);
                    this.state.hasChanges = false;

                    process.nextTick(() => {
                        this.state.changes = {};
                    });
                }
            })
        }
    };

    private _roles: KeyValue<User[], string> = {};
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

    /**
     * This function will be called right after this entity is successfully created
     */
    public readonly then: (listener: EntityCreateListener<this>) => this = (listener: EntityCreateListener<this>): this => {
        this.on("create", listener);
        return this;
    }

    /**
     * This function will be called if the entity fails to be created
     */
    public readonly catch: (listener: EntityFailedCreateListener<this>) => this = (listener: EntityFailedCreateListener<this>): this => {
        this.on("failedCreate", listener);
        return this;
    }

    /**
     * Manually informs SharedIO that certain values of this entity are dependant on other values from this entity.
     */
    protected readonly bind = (properties: string | string[], dependencies: string | string[]) => {
        const propertyArray = (properties instanceof Array ? properties : [properties]) as EntityAttributeName<this>[];
        const dependencyArray = (dependencies instanceof Array ? dependencies : [dependencies]) as EntityAttributeName<this>[];

        const notFound: string[] = [];

        for (const dependencyName of dependencyArray) {
            for (const propertyName of propertyArray) {
                if (dependencyName === propertyName) throw new SharedIOError("circularPropertyDepedency", propertyName);

                if (!(propertyName in this) && notFound.indexOf(propertyName) < 0) notFound.push(propertyName);
                if (!(dependencyName in this) && notFound.indexOf(dependencyName) < 0) notFound.push(dependencyName);
            }
        }

        if (notFound.length) throw new SharedIOError("entityAttributesNotFound", this.type, notFound);

        this.on("change", ({ changes }: EntityChangeEvent) => {
            let hasDependenciesChanged = false;

            for (const dependencyName of dependencyArray) {
                if (Object.keys(changes).indexOf(dependencyName) >= 0) {
                    hasDependenciesChanged = true;

                    for (const propertyName of propertyArray) {
                        const oldValue = this.state.data[propertyName];
                        const newValue = this[propertyName];

                        if (!ObjectTransform.isEqual(oldValue, newValue)) {
                            this.state.changes[propertyName] = newValue;
                            this.state.hasChanges = true;
                        }
                    }

                    this.state.emitChanges();

                    break;
                }
            }
        })

        return this;
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