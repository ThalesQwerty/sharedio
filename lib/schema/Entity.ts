import { User, HasId } from ".";
import { Server } from "../connection";
import { KeyValue } from "../types/KeyValue";
import { SerializedEntity } from "../types";
import { GetAttributeRules } from '../utils/GetAttributeRules';

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

type EntityDefaultAttributeName = (keyof EntityDefaultAttributes)|(keyof HasId)|"resetId";

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
    public static serialize(entity: Entity, viewer: User): SerializedEntity {
        const clone = this.clone(entity);

        const serialized: SerializedEntity = {
            owned: false,
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
                    serialized.owned = clone.owner?.id && clone.owner.is(viewer) ? true : false;
                    break;
            }
            removeAttribute(defaultAttribute);
        }

        for (const attributeName in clone) {
            if (this.defaultAttributes.indexOf(attributeName as EntityDefaultAttributeName) < 0) {
                const attribute = (clone as any)[attributeName];

                const rules = GetAttributeRules(attributeName);
                const { parsedName: name } = rules;

                if (rules.visibility === "public" || (rules.visibility === "private" && serialized.owned)) {
                    if (typeof attribute === "function") serialized.actions.push(name);
                    else serialized.state[name] = attribute;
                }
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
