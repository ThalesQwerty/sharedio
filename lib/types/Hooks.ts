import { KeyValue } from ".";

export interface Hooks {
    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to create this entity.
     * The return value (true or false) will determine whether or not the user will be able to create a new instance of this entity.
     */
    _create?: () => boolean;

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity is created.
     * Similarly to a class constructor function, you should use this hook to initialize the entity.
     */
    _init?: (initialState: KeyValue) => void;

    /**
     * @SharedIO Hook Function
     *
     * This function will be called every server tick.
     */
    _tick?: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called before an user reads this entity's properties.
     */
    _read?: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called after an user updates this entity's properties and before the changes are propagated.
     */
    _update?: () => void;

    /**
     * @SharedIO Hook Function
     *
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    _delete?: () => boolean;

    /**
     * @SharedIO Hook Function
     *
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    _gone?: () => void;
}