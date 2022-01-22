import { User, HasId } from ".";
import { Server } from "../connection";
import { KeyValue } from "../types/KeyValue";

import * as _ from "lodash";
interface EntityDefaultAttributes {
    type: string;
    owner: User | null;
    server: Server | null;

    _create: () => boolean;
    _init: (initialState: KeyValue) => void;
    _tick: () => void;
    _read: () => void;
    _update: () => void;
    _delete: () => boolean;
    _gone: () => void;

    constructor?: Function;
}

export type EntityDefaultAttributeName =
    | keyof EntityDefaultAttributes
    | keyof HasId
    | "resetId";

export class Entity extends HasId implements EntityDefaultAttributes {
    public static defaultAttributes: EntityDefaultAttributeName[] = [
        "owner",
        "type",
        "server",
        "_init",
        "_tick",
        "_read",
        "_update",
        "_create",
        "_delete",
        "_gone",
        "id",
        "is",
        "constructor",
        "resetId",
    ];

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

    constructor(
        server: Server,
        type: string,
        owner: User | null = null,
    ) {
        super(type);
        this._server = server;
        this._type = type;
        this._owner = owner;
    }

    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to create this entity.
     * The return value (true or false) will determine whether or not the user will be able to create a new instance of this entity.
     */
    public _create(): boolean {
        return true;
    }

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity is created.
     * Similarly to a class constructor function, you should use this hook to initialize the entity.
     */
    public _init(initialState: KeyValue) {}

    /**
     * @SharedIO Hook Function
     *
     * This function will be called every server tick.
     */
    public _tick() {}

    /**
     * @SharedIO Hook Function
     *
     * Called before an user reads this entity's properties.
     */
    public _read() {}

    /**
     * @SharedIO Hook Function
     *
     * Called after an user updates this entity's properties and before the changes are propagated.
     */
    public _update() {}

    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    public _delete(): boolean {
        return true;
    }

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    public _gone() {}
}
