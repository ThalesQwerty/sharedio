import { User, HasId } from ".";
import { Server } from "../connection";
import { KeyValue } from "../types/KeyValue";

import * as _ from "lodash";
interface EntityDefaultAttributes {
    /**
     * Returns the name of this entity's type
     */
    type: string;

    /**
     * Returns the user who created this entity
     */
    owner: User | null;

    /**
     * Returns this entity's server
     */
    server: Server | null;

    /**
     * This function is called before an user attempts to create this entity
     */
    create: () => boolean;

    /**
     * This function is called right after this entity is created
     */
    init: (initialState: KeyValue) => void;

    /**
     * This function is called every server tick
     */
    tick: () => void;

    /**
     * This function is called before an user reads this entity's properties
     */
    read: () => void;

    /**
     * This function is called after an user updates this entity's properties and before the changes are propagated
     */
    update: () => void;

    /**
     * This function is called before an user attempts to delete this entity
     */
    delete: () => boolean;

    /**
     * This function is called right after this entity gets deleted
     */
    gone: () => void;

    constructor?: Function;
}

export type EntityDefaultAttributeName = (keyof EntityDefaultAttributes)|(keyof HasId)|"resetId";

export class Entity extends HasId implements EntityDefaultAttributes {
    public static defaultAttributes: EntityDefaultAttributeName[] = [
        "owner",
        "type",
        "server",
        "init",
        "tick",
        "read",
        "update",
        "create",
        "delete",
        "gone",
        "id",
        "is",
        "constructor",
        "resetId"
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

    constructor(server: Server, type: string, owner: User|null = null) {
        super(type);
        this._server = server;
        this._type = type;
        this._owner = owner;
    }

    public create(): boolean {
        return true;
    }

    public init(initialState: KeyValue) {}

    public tick() {}

    public read() {}

    public update() {}

    public delete(): boolean {
        return true;
    }

    public gone() {}
}
