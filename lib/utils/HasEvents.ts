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
    // (event: keyof EventNames, callback: Function): this;
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
    (event: keyof EventNames, props?: KeyValue): unknown;
}

export type EventListener<Events, Listeners, Object> =
    | Listeners
    | ((event: keyof Events, callback: Function) => Object);
export type EventEmitter<Events, Emitters> =
    | Emitters
    | ((event: keyof Events, props?: KeyValue) => unknown);

/**
 * Base class for all objects that have custom event listeners
 */
export class HasEvents {
    /**
     * List of event listeners for different types of events
     */
    private _listeners: KeyValue<Function[], string> =
        {} as KeyValue<Function[], string>;

    /**
     * Adds an event listener
     */
    public on(
        event: any,
        callback: any,
    ): object|undefined {
        if (this) {
            this._listeners ??= {};
            this._listeners[event] ??= [] as any;

            if (typeof this._listeners[event] === "function")
                this._listeners[event] = [
                this._listeners[event],
            ] as any[];

            this._listeners[event]?.push(callback);

            return this;
        } else {
            process.nextTick(() => {
                this.on(event, callback);
            });

            return undefined;
        }
    };

    /**
     * Emits an event, calling its listeners following the order by which they were added
     */
    public emit (
        event: any,
        props?: any,
    ): unknown {
        if (this) {
            props ??= {};
            this._listeners ??= {};
            let returnedValue: unknown = undefined;
            for (const listener of this._listeners[event] ?? []) {
                returnedValue = (listener as Function)(
                    props,
                    returnedValue,
                );
            }
            return returnedValue;
        } else {
            process.nextTick(() => {
                this.emit(event, props);
            });
            return undefined;
        }
    };

    /**
     * Removes an event listener
     */
    protected off(event?: string): void {
        if (this) {
            this._listeners ??= {};
            if (event) this._listeners[event] = [] as any;
            else for (const name in this._listeners) {
                    this._listeners[name] = [] as any;
                }
        } else {
            process.nextTick(() => {
                this.off(event);
            });
        }
    }
}
