import { KeyValue } from "../types";
import { ObjectTransform } from "./ObjectTransform";

function isObject(value: any) {
    return value instanceof Object && typeof value !== "function";
}

export type WatchedObjectChangeHandler = (params: {
    object: object, path: string, oldValue: unknown, newValue: unknown
}) => void

export function WatchObject<T extends Object>(object: T, dataStorage: KeyValue, key: string, onChange: WatchedObjectChangeHandler, watchedKeys?: string[]) {
    dataStorage[key] = ObjectTransform.clone(object);
    const data = dataStorage[key];

    watchedKeys ??= Object.keys(object);

    for (const propertyName of watchedKeys) {
        const value = (object as any)[propertyName];
        data[propertyName] = isObject(value) ? ObjectTransform.clone(value) : value;

        delete (object as any)[propertyName];

        Object.defineProperty(object, propertyName, {
            get: () => {
                const value = data[propertyName];

                if (isObject(value)) {
                    return WatchObject(value, data, propertyName, ({path, ...params}) => {
                        onChange({path: `${propertyName}.${path}`, ...params})
                    });
                } else {
                    return value;
                }
            },
            set: (newValue: any) => {
                const oldValue = data[propertyName];
                data[propertyName] = newValue;
                if (newValue !== oldValue) {
                    onChange({object, path: `${propertyName}`, newValue, oldValue});
                }
            }
        })
    }

    return new Proxy(object, {
        get: (target: any, propertyName: string) => {
            return target[propertyName];
        },
        set: (target: any, propertyName: string, newValue: any) => {
            const oldValue = target[propertyName];
            target[propertyName] = newValue;

            // detects the creation of a new property
            if (Object.keys(data).indexOf(propertyName) < 0) {
                onChange({object, path: propertyName, newValue, oldValue});
            }

            data[propertyName] = newValue;
            return true;
        }
    });
}