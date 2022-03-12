import { User } from ".";
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
    EntityInterface,
} from "../types";
import { HasEvents, HasId, ObjectTransform, EventListener, EventEmitter, WatchObject } from "../utils";

import * as _ from "lodash";
interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

export interface EntityState<EntityType extends Entity> {
    data: Partial<EntityInterface<EntityType>>,
    changes: Partial<EntityInterface<EntityType>>,
    hasChanges: boolean
}
export class Entity
    extends HasEvents<
    EntityEvents<Entity>,
    EntityListenerOverloads<Entity>,
    EntityEmitterOverloads<Entity>
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

    /**
     * Lists all custom attributes from an entity
     */
    public static attributes<EntityType extends Entity>(entity: EntityType) {
        return Object.getOwnPropertyNames(entity).filter(name => !Entity.isDefaultAttribute(name));
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
        changes: {},
        hasChanges: false
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

                const attributeList = Entity.attributes(this);

                WatchObject(
                    this,
                    this.state,
                    "data",
                    ({path, newValue}) => {
                        _.set(this.state.changes, path, newValue);

                        if (!this.state.hasChanges) {
                            this.state.hasChanges = true;

                            process.nextTick(() => {
                                this.emit("change", {
                                    entity: this,
                                    changes: ObjectTransform.clone(this.state.changes)
                                });

                                this.state.changes = {};
                                this.state.hasChanges = false;
                            })
                        }
                    },
                    attributeList
                );

                if (initialState) {
                    for (const attributeName in attributeList) {
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

    public readonly on: EventListener<EntityEvents<this>, EntityListenerOverloads<this>, this> = this.on;
    protected readonly emit: EventEmitter<EntityEvents<this>, EntityEmitterOverloads<this>> = this.emit;

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
