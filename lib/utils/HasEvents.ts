import { HasId } from ".";
import { KeyValue } from "../types";

export interface EventOverloads<EventNames extends object = object> {
    (event: keyof EventNames, callback: Function): void;
}

export abstract class HasEvents<
    Listeners extends object,
    Overloads extends EventOverloads<Listeners>,
> extends HasId {
    /**
     * List of event listeners for different types of events
     */
    protected _listeners: KeyValue<Function[], keyof Listeners> = {};

    /**
     * Adds an event listener
     */
    public on:
        | Overloads
        | ((event: keyof Listeners, callback: Function) => void) = (
        event: keyof Listeners,
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
    protected emit(
        event: keyof Listeners,
        ...props: unknown[]
    ): this {
        for (const listener of this._listeners[event] ?? []) {
            (listener as Function)(...props);
        }
        return this;
    }

    /**
     * Removes all current event listeners
     */
    public removeAllListeners(event?: keyof Listeners) {
        if (event) this._listeners[event] = [] as any;
        else
            for (const name in this._listeners) {
                this._listeners[name as keyof Listeners] = [] as any;
            }
    }

    constructor(prefix: string) {
        super(prefix);
    }
}
