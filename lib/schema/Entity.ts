import { User } from ".";
import { Server } from "../connection";
import { KeyValue, Hooks, hookNameList } from "../types";
import { HasId } from "../utils";

import * as _ from "lodash";
interface EntityDefaultAttributes extends Hooks {
    type: string;
    owner: User | null;
    server: Server | null;
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
        "id",
        "is",
        "constructor",
        "resetId",
        ...hookNameList
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

    constructor(
        server: Server,
        owner: User | null = null,
    ) {
        super("Entity");
        this._server = server;
        this._type = this.constructor.name;
        this._owner = owner;
    }

    public _BeforeCreate(): boolean {
        return true;
    }

    public _BeforeDelete(): boolean {
        return true;
    }

    public _OnCreate(initialState: KeyValue) {}
    public _OnServerTick() {}
    public _OnRender() {}
    public _OnChange() {}
    public _OnDelete() {}
}
