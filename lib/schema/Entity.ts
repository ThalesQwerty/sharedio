import { Channel, User } from ".";
import { Server } from "../connection/Server";
import {
    EntityEvents,
    EntityTraps,
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
    SharedIOError,
    EntityState,
    EntitySchema,
    EntityAttributeType,
    ChannelReservedAttributeName,
    // ChannelEvents,
} from "../types";
import { HasEvents, HasId, ObjectTransform, EventListener, EventEmitter, WatchObject, ExtractDependencies } from "../utils";
import { Mixin } from "../utils/Mixin";
import "reflect-metadata";

import * as _ from "lodash";

interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

class RawEntity
    extends HasId
    implements EntityReservedAttributes {
    /**
     * Lists the names of the reserved entity attributes. Those names cannot be used to create custom attributes.
     */
    public static get reservedAttributes(): EntityReservedAttributeName[] {
        if (!this._reservedAttributes) this._reservedAttributes = [
            ...Object.getOwnPropertyNames(
                new RawEntity({ server: Server.dummy }),
            ),
            ...Object.getOwnPropertyNames(new HasEvents()),
            ...Object.getOwnPropertyNames(RawEntity.prototype),
            ...Object.getOwnPropertyNames(HasId.prototype),
            ...Object.getOwnPropertyNames(HasEvents.prototype),
        ] as EntityReservedAttributeName[];

        return this._reservedAttributes;
    }
    private static _reservedAttributes?:EntityReservedAttributeName[] = undefined;

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
    public static attributes<EntityType extends RawEntity>(entity: EntityType) {
        return Object.getOwnPropertyNames(entity).filter(name => !RawEntity.isDefaultAttribute(name));
    }

    /**
     * Lists all custom properties from an entity
     */
     public static properties<EntityType extends RawEntity>(entity: EntityType) {
        const propertyDescriptors = Object.getOwnPropertyDescriptors(entity.constructor.prototype);
        const propertyNames: string[] = [];

        for (const propertyName in propertyDescriptors) {
            let propertyDescriptor = propertyDescriptors[propertyName];

            if ((!!propertyDescriptor.get || !!propertyDescriptor.set) && !RawEntity.isDefaultAttribute(propertyName)) propertyNames.push(propertyName);
        }
        return propertyNames;
    }

    /**
     * Lists all custom methods from an entity
     */
     public static methods<EntityType extends RawEntity>(entity: EntityType) {
        const methodDescriptors = Object.getOwnPropertyDescriptors(entity.constructor.prototype);
        const methodNames: string[] = [];

        for (const methodName in methodDescriptors) {
            let methodDescriptor = methodDescriptors[methodName];

            if ((!methodDescriptor.get && !methodDescriptor.set) && !RawEntity.isDefaultAttribute(methodName)) methodNames.push(methodName);
        }
        return methodNames;
    }

    public static get className() {
        return this.prototype.constructor.name;
    }

    public static getClassName<
        EntityType extends RawEntity,
        T extends EntityClassName | EntityType,
        >(entityOrType: T) {
        if (typeof entityOrType === "string") return entityOrType;
        else if (entityOrType instanceof RawEntity)
            return (entityOrType as RawEntity).type;
        else return (entityOrType as typeof RawEntity).className;
    }

    /**
     * Finds an entity by its ID.
     *
     * Returns null if it fails to find an entity.
     */
    public static find(entityId: string): RawEntity | null {
        return HasId.find(entityId) as RawEntity;
    }

    /**
     * Clones an entity
     */
    public static clone(entity: RawEntity): RawEntity {
        return ObjectTransform.clone(entity);
    }

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

    public static log<EntityType extends RawEntity>(entity: EntityType) {
        const printable = this.printable(entity);
        console.log(printable);
        return printable;
    }

    /**
     * Generates a simplified key-value pair that represents the entity. Useful for printing things on the console.
     */
    public static printable<EntityType extends RawEntity>(
        entity: EntityType,
    ): PrintableEntity<EntityType> {
        const clone = RawEntity.clone(entity);
        const simplified: KeyValue = { ...clone };

        for (const reservedAttribute of RawEntity.reservedAttributes) {
            const value = (entity as any)[reservedAttribute];

            if (value instanceof HasId) {
                simplified[reservedAttribute] = value.id;
            } else {
                simplified[reservedAttribute] = value;
            }
        }

        for (const reservedAttribute of RawEntity.reservedAttributes) {
            const value = (entity as any)[reservedAttribute];

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
     * RawEntity class name
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

                    this.server.queue.add(this);
                    this.state.hasChanges = false;

                    process.nextTick(() => {
                        this.state.changes = {};
                    });
                }
            })
        }
    };

    public static get schema() {
        if (!this._schema) {
            const dummy = new this({ server: Server.dummy });
            dummy.off();

            const attributeList = RawEntity.attributes(dummy);
            dummy.delete();

            const getType = (object: any, attributeName: string) => {
                const type = Reflect.getMetadata(
                    "design:type",
                    object,
                    attributeName
                )?.name.toLowerCase() as EntityAttributeType;

                return type === "any" ? undefined : type;
            }

            this._schema = {
                className: dummy.type,
                attributes: {}
            };

            const defaultSchema:EntitySchema["attributes"][string] = {
                name: "",
                type: "any",
                initialValue: undefined,
                dependencies: [],
                visibility: "internal",
                readonly: false,
                get: false,
                set: false,
            };

            for (const attributeName of attributeList) {
                const initialValue = (dummy as any)[attributeName];
                this._schema.attributes[attributeName] = {
                    ...defaultSchema,
                    name: attributeName,
                    type: getType(dummy, attributeName) ?? typeof initialValue,
                    initialValue
                }
            }

            const computedAttributes = Object.getOwnPropertyDescriptors(this.prototype);

            for (const attributeName in computedAttributes) {
                if (attributeName !== "constructor") {
                    const propertyDescriptor = computedAttributes[attributeName];
                    const dependencies: string[] = ExtractDependencies(this, attributeName);
                    const initialValue = (dummy as any)[attributeName];

                    this._schema.attributes[attributeName] = {
                        ...defaultSchema,
                        name: attributeName,
                        type: getType(this.prototype, attributeName) ?? typeof initialValue,
                        initialValue,
                        get: !!propertyDescriptor.get,
                        set: !!propertyDescriptor.set,
                        dependencies
                    }
                }
            }
        }

        return this._schema;
    }
    private static _schema?: EntitySchema;

    constructor({ server, initialState, owner }: EntityConfig) {
        super("RawEntity");

        this._server = server;
        this._owner = owner ?? null;

        process.nextTick(() => {
            const created = this.exists !== false;
            if (!created) {
                this.delete();
                return;
            }

            this._exists = true;

            const attributeList = RawEntity.attributes(this);
            WatchObject(
                this,
                this.state,
                "data",
                ({path, newValue}) => {
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

            this._server.entities.push(this);

            this.emit("create", {
                entity: this,
                user: owner,
            });
        });
    }

    public get schema(): EntitySchema<this> {
        return (this.constructor as typeof RawEntity).schema as EntitySchema<this>;
    }

    /**
     * Deletes this entity
     *
     * @param user Who is trying to delete? (it's **null** if entity is being deleted by the server)
     */
    public delete(user: User | null = null) {
        if (this.exists !== false && this.emit("canDelete?", ({entity: this, user})) !== false) {
            this.server.removeEntity(this);
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

interface RawEntity extends HasEvents {
    on: EntityListenerOverloads<this>,
    emit: EntityEmitterOverloads<this>,
}

export class Entity extends Mixin(RawEntity, [HasEvents]) {}
