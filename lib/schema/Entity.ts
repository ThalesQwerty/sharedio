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
        ...Object.getOwnPropertyNames(new Entity(new Server())),
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
    public get exists(): boolean {
        return this.server.entities.find((currentEntity) =>
            currentEntity.is(this),
        )
            ? true
            : false;
    }

    /**
     * Generates a simplified key-value pair that represents the entity. Useful for printing things on the console.
     */
    public static printable<Type extends Entity>(entity: Type): PrintableEntity<Type> {
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

        return simplified as PrintableEntity<Type>;
    }

    constructor(
        server: Server,
        initialState?: KeyValue<EntityAttribute, string>,
        owner?: User | null,
    ) {
        super("Entity");
        this._server = server;
        this._type = this.constructor.name;
        this._owner = owner ?? null;

        this.on("delete", () => {
            setTimeout(() => this.removeAllListeners(), 0);
        });

        const created = this._Constructor();

        if (created) {
            this._server.entities.push(this);
            if (initialState) {
                for (const attributeName in initialState) {
                    if (attributeName in this) (this as any)[attributeName] = initialState[attributeName];
                }
            }
            setTimeout(() =>
                this.emit("create", {
                    entity: this,
                    user: owner,
                }), 0
            );
        } else {
            this.removeAllListeners();
            this.delete();
        }
    }

    /**
     * @SharedIO
     * Constructor
     *
     * This is a special function that will be called automatically whenever a new instance of this entity is created.
     *
     * This function can be used for:
     * - Initializing values
     * - Setting up event listeners (use the "on" method)
     * - Generating side effects on the server
     * - Verifying whether or not the entity can be created by an user
     *
     * Return **false** to deny the creation of the entity, and **true** to allow it.
     *
     * Decorators such as "@Public" and "@Private" cannot be added to this method.
     */
    protected _Constructor(): boolean {
        return true;
    }

    /**
     * Deletes this entity
     *
     * @param user Who is trying to delete? (it's **null** if entity is being deleted by the server)
     */
    public delete(user: User | null = null) {
        this.server.deleteEntity(this, user);
    }
}