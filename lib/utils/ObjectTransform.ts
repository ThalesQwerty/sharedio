import _ from "lodash";
import { KeyValue } from "../types";

export interface KeyValueDifference<
    T  extends KeyValue = KeyValue,
> {
    add: T;
    remove: string[];
}

export class ObjectTransform {
    static keys<T extends KeyValue = KeyValue>(
        object: T
    ): string[] {
        return Object.keys(object)
            .filter(key => object[key] instanceof Object)
            .map(key => this.keys(object[key]).map((subkey: string) => `${key}.${subkey}`))
            .reduce((previousArray, currentArray) => previousArray.concat(currentArray), Object.keys(object))
    }

    static flatten<T extends KeyValue = KeyValue>(
        object: T,
        objectKeys?: string[]
    ) {
        const keys = objectKeys ?? this.keys(object);
        const flatten: KeyValue<T extends Object|Array<any> ? never : T> = {};

        for (const key of keys) {
            const value = _.get(object, key) as any;
            if (!(value instanceof Object) && !(value instanceof Array)) flatten[key] = value;
        }

        return flatten;
    }

    static unflatten<T extends KeyValue = KeyValue>(
        flatObject: T
    ) {
        const unflatten = {};

        for (const key in flatObject) {
            _.set(unflatten, key, flatObject[key]);
        }

        return unflatten;
    }

    static delta(
        previousState: KeyValue,
        currentState: KeyValue
    ) {
        const delta: KeyValueDifference = {
            add: {},
            remove: []
        };

        const previousKeys = this.keys(previousState);
        const currentKeys = this.keys(currentState);
        const allKeys = _.uniq(previousKeys.concat(currentKeys));

        const flatPreviousState = this.flatten(previousState, previousKeys);
        const flatCurrentState = this.flatten(currentState, currentKeys);

        for (const key of allKeys) {
            const created = previousKeys.indexOf(key) < 0;
            const deleted = currentKeys.indexOf(key) < 0;

            if (deleted) {
                delta.remove.push(key);
            } else if (created || flatPreviousState[key] !== flatCurrentState[key]) {
                const currentValue = flatCurrentState[key];
                if (currentValue !== undefined) _.set(delta.add, key, currentValue);
                else if (!created) delta.remove.push(key);
            }
        }

        return delta as KeyValueDifference;
    }

    static isEqual(a: any, b: any) {
        if (a instanceof Object && b instanceof Object) {
            for (const key of Object.keys(a)) {
                if (!this.isEqual(a[key], b[key])) return false;
            }
            return true;
        } else {
            return a === b;
        }
    }

    static readonly clone = _.cloneDeep;
    static readonly get = _.get;
    static readonly set = _.set;
}