import { HasId } from ".";
import { KeyValue } from "../types";

/**
 * Allows overload declarations for the "on" function
 */
export interface ListenerOverloads<
    EventNames extends object = object,
> {
    /**
     * Adds an event listener
     */
    (event: keyof EventNames, callback: Function): void;
}

/**
 * Allows overload declarations for the "emit" function
 */

export interface EmitterOverloads<
    EventNames extends object = object,
> {
    /**
     * Emits an event
     */
    (event: keyof EventNames, props?: KeyValue): void;
}

/**
 * Base class for all objects that have custom event listeners
 */
export abstract class HasEvents<
    Events extends object,
    Listeners extends ListenerOverloads<Events>,
    Emitters extends EmitterOverloads<Events>,
> extends HasId {
    /**
     * List of event listeners for different types of events
     */
    protected _listeners: KeyValue<Function[], keyof Events> = {};

    /**
     * Adds an event listener
     */
    public on:
        | Listeners
        | ((event: keyof Events, callback: Function) => void) = (
        event: keyof Events,
        callback: Function,
    ): void => {
        this._listeners[event] ??= [] as any;

        if (typeof this._listeners[event] === "function")
            this._listeners[event] = [
                this._listeners[event],
            ] as any[];

        this._listeners[event]?.push(callback);
    };

    /**
     * Emits an event, calling its listeners following the order by which they were added
     */
    protected emit:
        | Emitters
        | ((event: keyof Events, props?: KeyValue) => void) = (
        event: keyof Events,
        props?: KeyValue,
    ): void => {
        props ??= {};
        for (const listener of this._listeners[event] ?? []) {
            (listener as Function)(props);
        }
    };

    /**
     * Removes all current event listeners
     */
    public removeAllListeners(event?: keyof Events) {
        if (event) this._listeners[event] = [] as any;
        else
            for (const name in this._listeners) {
                this._listeners[name as keyof Events] = [] as any;
            }
    }

    constructor(prefix: string) {
        super(prefix);
    }
}
