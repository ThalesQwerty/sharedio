import { User, HasId } from ".";
import { Server } from "../connection";
import { KeyValue } from "../utils/KeyValue";

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

    constructor?: Function;
}

type EntityDefaultAttributeName = (keyof EntityDefaultAttributes)|(keyof HasId)|"resetId";

export interface SerializedEntity {
    owner: string|null,
    id: string,
    state: KeyValue,
    actions: string[]
}

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
     * Returns a serialized version of an entity
     */
    public static serialize(entity: Entity): SerializedEntity {
        const clone = this.clone(entity);

        const serialized: SerializedEntity = {
            owner: null,
            id: "",
            state: {},
            actions: []
        };

        function removeAttribute(name: string) {
            delete (clone as any)[name];
            delete (clone as any)["_" + name];
        }

        for (const defaultAttribute of this.defaultAttributes) {
            switch (defaultAttribute) {
                case "id":
                    serialized.id = clone.id;
                    break;
                case "owner":
                    serialized.owner = clone.owner?.id ?? null;
                    break;
            }
            removeAttribute(defaultAttribute);
        }

        for (const attributeName in clone) {
            if (this.defaultAttributes.indexOf(attributeName as EntityDefaultAttributeName) < 0) {
                const attribute = (clone as any)[attributeName];
                if (typeof attribute === "function") serialized.actions.push(attributeName);
                else serialized.state[attributeName] = attribute;
            }
        }

        return serialized;
    }

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
