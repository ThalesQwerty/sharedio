import { User } from ".";
import { Server } from "../connection";
import {
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads,
    KeyValue,
    EntityDefaultAttributeName,
    EntityAttributeName,
    EntityAttribute,
    SerializedEntity,
    PrintableEntity,
} from "../types";
import { HasEvents, HasId } from "../utils";

import * as _ from "lodash";
interface EntityDefaultAttributes {
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
    implements EntityDefaultAttributes
{
    public static defaultAttributes: EntityDefaultAttributeName[] = [
        "owner",
        "type",
        "server",
        "id",
        "is",
        "constructor",
        "resetId",
        "emit",
        "on",
        "delete",
        "exists",
        "_listeners",
        "removeAllListeners",
        "_Constructor",
    ];

    public static isDefaultAttribute(attributeName: string): boolean {
        for (const defaultAttributeName of this.defaultAttributes) {
            if (
                attributeName === defaultAttributeName ||
                (attributeName[0] === "_" &&
                    attributeName.substring(1) ===
                        defaultAttributeName) ||
                (defaultAttributeName[0] === "_" &&
                    defaultAttributeName.substring(1) ===
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

        for (const defaultAttribute of Entity.defaultAttributes) {
            const value = entity[defaultAttribute];

            if (value instanceof HasId) {
                simplified[defaultAttribute] = value.id;
            } else {
                simplified[defaultAttribute] = value;
            }
        }

        for (const defaultAttribute of Entity.defaultAttributes) {
            const value = entity[defaultAttribute];

            switch (defaultAttribute) {
                case "id":
                case "type":
                    simplified[defaultAttribute] = value;
                    break;
                default:
                    if (value instanceof HasId) {
                        simplified[defaultAttribute] = value.id;
                    } else {
                        delete simplified[defaultAttribute];
                    }
                    break;
            }

            delete simplified["_" + defaultAttribute];
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

        if (!this.exists) this.server.entities.push(this);

        this.on("delete", () => {
            setTimeout(() => this.removeAllListeners(), 0);
        });

        const shouldCreate = this._Constructor();

        if (shouldCreate) {
            this._server.entities.push(this);
            if (initialState) {
                Object.keys(initialState).forEach((key) => {
                    if (key in this)
                        (this as any)[key] = initialState[key];
                });
            }
            setTimeout(() =>
                this.emit("create", {
                    entity: this,
                    user: owner,
                }),
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
