import { ObjectTransform } from "./ObjectTransform";
import { KeyValue } from "../types";

export type WatchedObjectChangeHandler<ObjectType extends Object> = (params: Partial<{ [key in keyof ObjectType]: any }>) => void;
export type WatchedObjectCallHandler<ObjectType extends Object> = (params: { methodName: string, args: any[] }) => void;

type WatchedObjectHandlers<ObjectType extends Object> = {
    change?: WatchedObjectChangeHandler<ObjectType>,
    call?: WatchedObjectCallHandler<ObjectType>
};

type WatchedObjectOptions<keys extends string | number | symbol = string> = { include?: keys[], exclude?: keys[] };

export function WatchObject<ObjectType extends Object>(object: ObjectType, eventHandlers: WatchedObjectHandlers<ObjectType>, options?: WatchedObjectOptions<keyof ObjectType>, previousPath: (keyof ObjectType)[] = []): ObjectType {
    type ObjectKey = keyof ObjectType;

    // This property will serve as a change log that refreshes every Node's tick
    (object as any)["@"] = null;

    const addChanges = (changes: KeyValue<any, string>) => {
        if (!(object as any)["@"]) {
            (object as any)["@"] = {};
            process.nextTick(() => {
                // Dispatches change event
                eventHandlers.change?.(ObjectTransform.clone((object as any)["@"]));
                (object as any)["@"] = null;
            });
        }
        Object.keys(changes).forEach(path => ObjectTransform.set((object as any)["@"], path, changes[path]));
    }

    const watchedKeys = Object.keys(object).filter(_key => {
        if (_key[0] === "@") return false;
        const key = _key as ObjectKey;
        return options ? (options.include ? options.include.includes(key) : (options.exclude ? !options.exclude.includes(key) : true)) : true;
    }) as ObjectKey[];

    for (const propertyName of watchedKeys) {
        const fieldName = `@${propertyName}` as ObjectKey;
        const path = [...previousPath, propertyName];
        const property = object[propertyName];

        if (typeof property === "function") {
            // Watches for functions calls
            const watchedMethod = (...args: any[]) => {
                property(...args);
                eventHandlers.call?.({ methodName: propertyName.toString(), args });
            };
            object[fieldName] ??= watchedMethod as any;
        } else {
            object[fieldName] ??= property;
        }

        const handleArraysAndObjects = (value: Object) => {
            if (value instanceof Array) {
                object[fieldName] = new Proxy(value, {
                    apply: (methodName: string, target: any, argumentsList: any[]) => {
                        return target[methodName].apply(target, argumentsList);
                    },
                    deleteProperty: () => {
                        return true;
                    },
                    set: (target: any, propertyName: string, newValue: any) => {
                        const oldValue = target[propertyName];
                        const oldArray = [...target];

                        target[propertyName] = newValue;

                        if (oldValue !== newValue) {
                            handleArraysAndObjects(newValue);
                            addChanges({ [path.join(".")]: target });
                        }
                        return true;
                    }
                });
            }
            else if (value && typeof value === "object") {
                object[fieldName] = WatchObject<any>(value, eventHandlers, undefined, path);
            }
        }

        Object.defineProperty(object, propertyName, {
            get: () => {
                return object[fieldName];
            },
            set: (newValue: any) => {
                const oldValue = object[fieldName];

                object[fieldName] = newValue;

                if (newValue !== oldValue) {
                    handleArraysAndObjects(newValue);
                    addChanges({ [path.join(".")]: newValue });
                }
            },
            configurable: true,
            enumerable: true,
        });

        handleArraysAndObjects(property);
    }

    return object;
}