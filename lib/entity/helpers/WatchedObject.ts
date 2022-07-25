type WatchedObjectChangeHandler = (params: { propertyName: string, previousValue: unknown, attemptedValue: unknown, value: unknown }) => void;
type WatchedObjectCallHandler = (params: { methodName: string, parameters: any[] }) => void;

type WatchedObjectHandlers = {
    write?: WatchedObjectChangeHandler,
    call?: WatchedObjectCallHandler
};

type WatchedObjectOptions<ObjectType extends object> = {
    include?: (keyof ObjectType)[],
    exclude?: (keyof ObjectType)[]
};

export function WatchedObject<ObjectType extends object>(object: ObjectType, eventHandlers: WatchedObjectHandlers, options: WatchedObjectOptions<ObjectType> = {}, previousPath: string[] = []): ObjectType {
    type ObjectKey = keyof ObjectType;

    const getPath = (propertyName: string) => {
        return [...previousPath, propertyName];
    }

    const shouldWatchKey = (_propertyName: string) => {
        const propertyName = _propertyName as ObjectKey;
        if (options.exclude?.includes(propertyName) || (options.include && !options.include?.includes(propertyName))) return false;
        else return true;
    }

    const proxy = new Proxy(object, {
        get(target: any, propertyName: string) {
            const value = target[propertyName];
            if (!shouldWatchKey(propertyName)) return value;

            if (value instanceof Function) {
                return (...args: any[]) => {
                    eventHandlers.call?.({ methodName: getPath(propertyName).join("."), parameters: args });
                    return (value as Function).call(proxy, ...args);
                }
            } else if (value instanceof Array) {
                return new Proxy(value, {
                    apply: (methodName: string, target: any, argumentsList: any[]) => {
                        return target[methodName].apply(target, argumentsList);
                    },
                    deleteProperty: () => {
                        return true;
                    },
                    set: (target: any, index: string, newArray: any) => {
                        const oldValue = target[index];
                        const oldArray = [...target];

                        target[index] = newArray;

                        if (oldValue !== newArray) {
                            eventHandlers.write?.({
                                propertyName: getPath(propertyName).join("."),
                                value: target,
                                attemptedValue: newArray,
                                previousValue: oldArray
                            });
                        }
                        return true;
                    }
                });
            } else if (value instanceof Object) {
                return WatchedObject(value, eventHandlers, {}, getPath(propertyName));
            }
            else {
                return value;
            }
        },
        set(target: any, propertyName: string, newValue: any) {
            if (propertyName === "__proto__" || propertyName === "constructor") return false;

            const oldValue = target[propertyName];

            target[propertyName] = newValue;

            if (shouldWatchKey(propertyName) && newValue !== oldValue) {
                eventHandlers.write?.({ propertyName: getPath(propertyName).join("."), value: target[propertyName], previousValue: oldValue, attemptedValue: newValue });
            }

            return true;
        },
        deleteProperty(target: any, propertyName: string) {
            if (shouldWatchKey(propertyName) && propertyName in target) {
                eventHandlers.write?.({ propertyName: getPath(propertyName).join("."), value: undefined, attemptedValue: undefined, previousValue: target[propertyName] });
            }
            return true;
        }
    } as ProxyHandler<any>);

    return proxy;
}