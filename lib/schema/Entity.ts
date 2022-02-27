import { User } from ".";
import { Server } from "../connection/Server";
import {
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads,
    KeyValue,
    EntityReservedAttributeName,
    EntityAttributeName,
    EntityAttribute,
    SerializedEntity,
    PrintableEntity,
    EntityClassName,
    EntityCreateListener,
    EntityConfig,
    EntityFailedCreateListener,
} from "../types";
import { HasEvents, HasId, EventListener } from "../utils";

import * as _ from "lodash";
interface EntityReservedAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}
export class Entity
    extends HasEvents<
        EntityEvents,
        EntityListenerOverloads,
        EntityEmitterOverloads
    >
    implements EntityReservedAttributes
{
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
        return _.cloneDeep(entity);
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

    /**
     * Entity class name
     */
    public get type() {
        return this._type;
    }
    private _type: string;

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

    constructor({ server, initialState, owner }: EntityConfig) {
        super("Entity");
        this._server = server;
        this._type = this.constructor.name;
        this._owner = owner ?? null;

        this.on("delete", () => {
            setTimeout(() => this.removeAllListeners(), 0);
        });

        setTimeout(() => {
            const created = this.exists !== false; //this._Constructor() !== false;

            if (created) {
                this._server.entities.push(this);

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
            } else {
                // this.removeAllListeners();
                // this.delete();
            }
        }, 0);
    }

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
    public readonly then = (listener: EntityCreateListener) =>
        this.on("create", listener);

    /**
     * This function will be called if the entity fails to be created
     */
    public readonly catch = (listener: EntityFailedCreateListener) =>
        this.on("failedCreate", listener);
}
