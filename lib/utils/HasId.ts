import { RandomHex } from "../utils/RandomHex";

const ID_CHAR_LENGTH = 32;

export type id<preffix extends string> = `${preffix}_${string}`;

/**
 * Base class for all objects that have a random and unique hex ID associated with them
 */
export abstract class HasId {
    private get preffix() {
        return this.id.indexOf("_") < 0 ? "" : this.id.split("_")[0];
    }

    /**
     * The random and unique hex ID associated with this object
     */
    public get id(): string {
        return this._id;
    }
    private _id: string;

    /**
     * Returns if this SharedIO object is the same object as another one.
     */
    public is(object: HasId) {
        return object && this.id && this.id === object.id
            ? true
            : false;
    }

    /**
     * Lists every object that has an ID
     */
    public static get list() {
        return this._list;
    }
    private static _list: HasId[] = [];

    /**
     * Lists every object that has an ID and belongs to a certain class
     */
    public static only(type: new (...params: any[]) => HasId) {
        return this.list.filter((object) => object instanceof type);
    }

    /**
     * Finds a SharedIO object by its ID
     */
    public static find(id: string): HasId | null {
        if (!id) return null;

        const found = this.list.filter((object) => object.id === id);
        return found ? (found[0] as HasId) : null;
    }

    /**
     * Generates a new ID for this object
     */
    protected resetId(preffix?: string) {
        let id = "";
        preffix = preffix != undefined ? preffix + "_" : this.preffix;

        do {
            id = RandomHex(ID_CHAR_LENGTH);
            this._id = preffix + id;
        } while (id in HasId.list);

        HasId.list.push(this);
    }

    public constructor(preffix: string = "") {
        this._id = "placeholder";
        this.resetId(preffix);
    }
}
