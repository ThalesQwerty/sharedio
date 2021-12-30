import { RandomHex } from "../utils/RandomHex";

const ID_CHAR_LENGTH = 32;

/**
 * Base class for all objects that have a random and unique hex ID associated with them
 */
export class HasId {
    /**
     * The random and unique hex ID associated with this object
     */
    public get id():string { return this._id };
    private _id:string;

    /**
     * Returns if this SharedIO object is the same object as another one.
     */
    public is(object: HasId) {
        return (object && this.id && this.id === object.id) ? true : false;
    }

    protected static list:HasId[] = [];

    /**
     * Finds a SharedIO object by its ID
     */
    public static find<T extends HasId = HasId>(id: string): T|null {
        if (!id) return null;

        const found = this.list.filter(object => object.id === id);
        return found ? (found[0] as T) : null;
    }

    /**
     * Generates a new ID for this object
     */
    protected resetId() {
        let id = "";

        do {
            id = RandomHex(ID_CHAR_LENGTH);
            this._id = id;
        } while (id in HasId.list);

        HasId.list.push(this);
    }

    public constructor() {
        this._id = "placeholder";
        this.resetId();
    }
}