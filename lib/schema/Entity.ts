import { User, HasId } from ".";
import { Server } from "../connection";
import { KeyValue } from "../utils/KeyValue";

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
    init: () => void;

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
}

type EntityDefaultAttributeName = keyof EntityDefaultAttributes;

export class Entity extends HasId implements EntityDefaultAttributes {
    public defaultAttributes: EntityDefaultAttributeName[] = [
        "owner",
        "type",
        "server",
        "tick",
        "read",
        "update",
        "create",
        "delete",
        "gone",
    ];

    public get type() {
        return this._type;
    }
    private _type: string;

    public get owner() {
        return this._owner;
    }
    private _owner: User | null = null;

    public get server() {
        return this._server;
    }
    private _server: Server;

    constructor(server: Server, type: string) {
        super(type);
        this._server = server;
        this._type = type;
    }

    public create(): boolean {
        return true;
    }

    public init() {}

    public tick() {}

    public read() {}

    public update() {}

    public delete(): boolean {
        return true;
    }

    public gone() {}
}
