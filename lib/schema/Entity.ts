import { Rules, User } from ".";
import { Server } from "../connection/Server";
import {
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads,
    KeyValue,
    EntityReservedAttributeName,
    PrintableEntity,
    EntityClassName,
    EntityCreateListener,
    EntityConfig,
    EntityFailedCreateListener,
    EntityAttributeName,
} from "../types";
import { HasEvents, HasId, ObjectTransform } from "../utils";

import * as _ from "lodash";
interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

export interface EntityState<EntityType extends Entity> {
    data: Partial<KeyValue<any, EntityAttributeName<EntityType>>>,
    changes: Partial<KeyValue<any, EntityAttributeName<EntityType>>>,
    broadcaster?: NodeJS.Immediate
}
export class Entity
    extends HasEvents<
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads
    >
    implements EntityReservedAttributes {
    /**
     * Lists the names of the reserved entity attributes. Those names cannot be used to create custom attributes.
     */
    public static reservedAttributes = [
        ...Object.getOwnPropertyNames(
            new Entity({ server: new Server() }),
        ),
        ...Object.getOwnPropertyNames(Entity.prototype),
        ...Object.getOwnPropertyNames(HasId.prototype),
        ...Object.getOwnPropertyNames(HasEvents.prototype),
    ] as EntityReservedAttributeName[];

    public static isDefaultAttribute(attributeName: string): boolean {
        for (const reservedAttributeName of this.reservedAttributes) {
            if (
                attributeName === reservedAttributeName ||
                (attributeName[0] === "_" &&
                    attributeName.substring(1) ===
                    reservedAttributeName) ||
                (reservedAttributeName[0] === "_" &&
                    reservedAttributeName.substring(1) ===
                    attributeName)
            )
                return true;
        }
        return false;
    }

    public static get className() {
        return this.prototype.constructor.name;
    }

    public static getClassName<
        EntityType extends Entity,
        T extends EntityClassName | EntityType,
        >(entityOrType: T) {
        if (typeof entityOrType === "string") return entityOrType;
        else if (entityOrType instanceof Entity)
            return (entityOrType as Entity).type;
        else return (entityOrType as typeof Entity).className;
    }

    /**
     * Finds an entity by its ID.
     *
     * Returns null if it fails to find an entity.
     */
    public static find(entityId: string): Entity | null {
        return HasId.find(entityId) as Entity;
    }

    /**
     * Clones an entity
     */
    public static clone(entity: Entity): Entity {
        return ObjectTransform.clone(entity);
    }

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

    public static log<EntityType extends Entity>(entity: EntityType) {
        const printable = this.printable(entity);
        console.log(printable);
        return printable;
    }

    /**
     * Generates a simplified key-value pair that represents the entity. Useful for printing things on the console.
     */
    public static printable<EntityType extends Entity>(
        entity: EntityType,
    ): PrintableEntity<EntityType> {
        const clone = Entity.clone(entity);
        const simplified: KeyValue = { ...clone };

        for (const reservedAttribute of Entity.reservedAttributes) {
            const value = entity[reservedAttribute];

            if (value instanceof HasId) {
                simplified[reservedAttribute] = value.id;
            } else {
                simplified[reservedAttribute] = value;
            }
        }

        for (const reservedAttribute of Entity.reservedAttributes) {
            const value = entity[reservedAttribute];

            switch (reservedAttribute) {
                case "id":
                case "type":
                    simplified[reservedAttribute] = value;
                    break;
                default:
                    if (value instanceof HasId) {
                        simplified[reservedAttribute] = value.id;
                    } else {
                        delete simplified[reservedAttribute];
                    }
                    break;
            }

            delete simplified["_" + reservedAttribute];
        }

        return simplified as PrintableEntity<EntityType>;
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
     * Does this entity exist or has it been deleted?
     */
    public get exists() {
        return this._exists;
        // return this.server.entities.find((currentEntity) =>
        //     currentEntity.is(this),
        // )
        //     ? true
        //     : false;
    }
    private _exists?: boolean;

    public readonly state: EntityState<this> = {
        data: {},
        changes: {}
    };

    constructor({ server, initialState, owner }: EntityConfig) {
        super("Entity");
        this._server = server;
        this._owner = owner ?? null;

        this.on("delete", () => {
            process.nextTick(() => this.removeAllListeners(), 0);
        });

        process.nextTick(() => {
            const created = this.exists !== false;

            if (created) {
                this._server.entities.push(this);

                const rules = Rules.from(this);

                for (const _attributeName in rules) {
                    const attributeName = _attributeName as EntityAttributeName<this>;
                    const entity = this as any;
                    const currentValue = entity[attributeName] != null && typeof entity[attributeName] !== "object" ? entity[attributeName] : ObjectTransform.clone(entity[attributeName]);

                    this.state.data[attributeName] = currentValue;

                    const prepareBroadcast = () => {
                        if (this.state.broadcaster) clearImmediate(this.state.broadcaster);

                        this.state.broadcaster = setImmediate(() => {
                            this.emit("change", {
                                entity: this,
                                changes: ObjectTransform.clone(this.state.changes)
                            });
                            this.state.changes = {};
                        })
                    }

                    if (typeof currentValue !== "function") {

                        const configWatchedState = (parent: any, path: string, data: any, changes: any) => {
                            const key = path.split(".")[path.split(".").length - 1];

                            if (!(parent[key] instanceof Object)) {

                                delete parent[key];

                                Object.defineProperty(parent, key, {
                                    get() {
                                        return data[key]
                                    },
                                    set(newValue: any) {
                                        const oldValue = data[key];

                                        data[key] = newValue;

                                        if (newValue !== oldValue || typeof newValue !== typeof oldValue) {
                                            changes[path] = newValue;
                                            prepareBroadcast();
                                        }
                                    }
                                });
                            } else {
                                const copy = ObjectTransform.clone(parent[key]);
                                data[key] ??= {};

                                // watch new keys
                                parent[key] = new Proxy(copy, {
                                    set(object, property: string, newValue) {

                                        if (object[property] === undefined) {
                                            copy[property] = newValue;
                                            data[key][property] = newValue;

                                            if (newValue instanceof Object) {
                                                const flat = ObjectTransform.flatten(newValue);

                                                for (const subpath in flat) {
                                                    changes[`${path}.${property}.${subpath}`] = flat[subpath];
                                                    prepareBroadcast();
                                                }
                                            } else {
                                                changes[`${path}.${property}`] = newValue;
                                                prepareBroadcast();
                                            }

                                            configWatchedState(parent[key], `${path}.${property}`, data[key], changes);
                                        }

                                        return true;
                                    }
                                })

                                // watch existing keys
                                for (const subkey of Object.keys(parent[key])) {
                                    configWatchedState(parent[key], `${path}.${subkey}`, data[key], changes);
                                }
                            }
                        }

                        configWatchedState(entity, attributeName, this.state.data, this.state.changes);
                    }
                }

                if (initialState) {
                    for (const attributeName in initialState) {
                        if (attributeName in this) {
                            const value = (initialState as any)[
                                attributeName
                            ];
                            if (value !== undefined)
                                (this as any)[attributeName] = value;
                        }
                    }
                }

                this.emit("create", {
                    entity: this,
                    user: owner,
                });
            }
        });
    }

    public readonly on: EntityListenerOverloads<this> = this.on;

    /**
     * Deletes this entity
     *
     * @param user Who is trying to delete? (it's **null** if entity is being deleted by the server)
     */
    public delete(user: User | null = null) {
        if (this._exists == null)
            this.emit("failedCreate", {
                entity: this,
                user: this.owner,
            });

        this._exists = false;
        this.server.deleteEntity(this, user);
    }

    /**
     * This function will be called right after this entity is successfully created
     */
    public readonly then = (listener: EntityCreateListener<this>): this =>
        this.on("create", listener) as any as this;

    /**
     * This function will be called if the entity fails to be created
     */
    public readonly catch = (listener: EntityFailedCreateListener<this>): this =>
        this.on("failedCreate", listener) as any as this;
}
