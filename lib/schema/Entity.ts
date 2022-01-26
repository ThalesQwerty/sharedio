import { User } from ".";
import { Server } from "../connection";
import {
    KeyValue,
    EntityEvents,
    EntityListenerOverloads,
    EntityEmitterOverloads,
} from "../types";
import { HasEvents } from "../utils";

import * as _ from "lodash";
import { EmitterOverloads } from '../utils/HasEvents';
interface EntityDefaultAttributes {
    type: string;
    owner: User | null;
    server: Server | null;
    constructor?: Function;
}

export type EntityDefaultAttributeName =
    | keyof Entity
    | "resetId"
    | "_listeners"
    | "emit"
    | "constructor"
    | "removeAllListeners"
    | "_Config";

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
        "_listeners",
        "removeAllListeners",
        "_Config",
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
     * Clones an entity
     */
    public static clone(entity: Entity): Entity {
        return _.cloneDeep(entity);
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

    constructor(server: Server, owner: User | null = null) {
        super("Entity");
        this._server = server;
        this._type = this.constructor.name;
        this._owner = owner;

        setTimeout(() => {
            const shouldCreate = this._Constructor();

            if (!shouldCreate) {
                this.removeAllListeners();
                this.server.deleteEntity(this);
            } else {
                this.on("delete", () => {
                    setTimeout(() => this.removeAllListeners(), 0);
                });
            }
        }, 0);
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

    public static emit(entity: Entity): EntityEmitterOverloads {
        return entity.emit;
    }
}
