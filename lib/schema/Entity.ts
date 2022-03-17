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
    SharedIOError,
} from "../types";
import { HasEvents, HasId, ObjectTransform, EventListener, EventEmitter, WatchObject, ExtractDependencies } from "../utils";

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
    hasChanges: boolean,
    readonly emitChanges: () => void
}

export interface EntitySchema<EntityType extends Entity = Entity> {
    className: string,
    attributes: {[name: string]: {
        name: string,
        initialValue: any,
        type: string,
        dependencies: string[]
    }}
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
        // return Object.getOwnPropertyNames(entity).concat(Object.getOwnPropertyNames(entity.constructor.prototype)).filter(name => !Entity.isDefaultAttribute(name));
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
    }
    private _exists?: boolean;

    public readonly state: EntityState<this> = {
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

                    process.nextTick(() => {
                        this.state.changes = {};
                        this.state.hasChanges = false;
                    })
                }
            })
        }
    };

    public static get schema() {
        if (!this._schema) {
            const dummy = new this({ server: Server.dummy });
            const attributeList = Entity.attributes(dummy);

            this._schema = {
                className: dummy.type,
                attributes: {}
            };

            for (const attributeName of attributeList) {
                const initialValue = (dummy as any)[attributeName];
                this._schema.attributes[attributeName] = {
                    name: attributeName,
                    type: typeof initialValue,
                    initialValue,
                    dependencies: []
                };
            }

            const computedAttributes = Object.getOwnPropertyDescriptors(this.prototype);

            for (const attributeName in computedAttributes) {
                if (attributeName !== "constructor") {
                    const dependencies: string[] = ExtractDependencies(this, attributeName);
                    const initialValue = (dummy as any)[attributeName];

                    this._schema.attributes[attributeName] = {
                        name: attributeName,
                        type: typeof initialValue,
                        initialValue,
                        dependencies
                    };
                }
            }
        }

        return this._schema;
    }
    private static _schema?: EntitySchema;

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
                const attributeList = Entity.attributes(this);
                WatchObject(
                    this,
                    this.state,
                    "data",
                    ({path, newValue}) => {
                        ObjectTransform.set(this.state.changes, path, newValue);
                        this.state.emitChanges();
                    },
                    attributeList
                )

                const schema = (this.constructor as any).schema as EntitySchema;

                if (schema) {
                    for (const attributeName in schema.attributes) {
                        if (attributeName in this) {
                            const rules = schema.attributes[attributeName];

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

                this._server.entities.push(this);

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

    readonly aaa = (a: keyof Omit<this, "_blah">):void => {
    }

    /**
     * Manually informs SharedIO that certain values of this entity are dependant on other values from this entity.
     */
    protected readonly bind = (properties: string|string[], dependencies:string|string[]) => {
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

        this.on("change", ({ changes }) => {
            let hasDependenciesChanged = false;

            for (const dependencyName of dependencyArray) {
                if (Object.keys(changes).indexOf(dependencyName) >= 0) {
                    hasDependenciesChanged = true;
                    break;
                }
            }

            if (hasDependenciesChanged) {
                for (const propertyName of propertyArray) {
                    const oldValue = this.state.data[propertyName];
                    const newValue = this[propertyName];

                    if (!ObjectTransform.isEqual(oldValue, newValue)) {
                        this.state.changes[propertyName] = newValue;
                        this.state.hasChanges = true;
                    }
                }

                this.state.emitChanges();
            }
        })

        return this;
    }
}
