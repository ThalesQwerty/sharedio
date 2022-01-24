import { KeyValue } from ".";

const hookNameList: (keyof Hooks)[] = [
    "_BeforeCreate",
    "_BeforeDelete",
    "_OnChange",
    "_OnCreate",
    "_OnDelete",
    "_OnRender",
    "_OnServerTick"
];
export interface Hooks {
    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to create this entity.
     * The return value (true or false) will determine whether or not the user will be able to create a new instance of this entity.
     *
     * **Do NOT call this function manually**
     */
    _BeforeCreate: () => boolean;

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity is created.
     * Similarly to a class constructor function, you should use this hook to initialize the entity.
     *
     * **Do NOT call this function manually**
     */
    _OnCreate: (initialState: KeyValue) => void;

    /**
     * @SharedIO Hook Function
     *
     * This function will be called every server tick.
     *
     * **Do NOT call this function manually**
     */
    _OnServerTick: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called before an user reads this entity's properties.
     *
     * **Do NOT call this function manually**
     */
    _OnRender: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called after an user updates this entity's properties and before the changes are propagated.
     *
     * **Do NOT call this function manually**
     */
    _OnChange: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     *
     * **Do NOT call this function manually**
     */
    _BeforeDelete: () => boolean;

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     *
     * **Do NOT call this function manually**
     */
    _OnDelete: () => void;
}

export {
    hookNameList
};