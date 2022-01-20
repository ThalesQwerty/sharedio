import { JsonDiffer } from "json-difference";
import { KeyValue } from "./KeyValue";

export interface KeyValueDiff {
    add?: KeyValue;
    remove?: string[];
}

export function Difference(
    previous: KeyValue,
    current: KeyValue,
): KeyValueDiff {
    const diff = new JsonDiffer().getDiff(previous, current);
    const _diff: KeyValue = { add: diff.new, remove: diff.removed };

    for (const created of diff.edited as KeyValue[]) {
        for (const key in created) {
            _diff.add[key] = created[key]["newvalue"];
        }
    }

    function insert(
        object: KeyValue,
        path: string,
        value: unknown,
    ): KeyValue {
        const steps = path.split("/");
        const current = steps[0];
        const next = steps
            .filter((step, index) => index > 0)
            .join("/");

        if (steps.length === 1) {
            object[current] = value;
        } else if (steps.length > 1) {
            object[current] ??= {};
            return insert(object[current], next, value);
        }

        return object;
    }

    const final: KeyValue = { add: {}, remove: [] };

    if (!Object.keys(_diff.add).length) delete final.add;
    else
        for (const key in _diff.add) {
            insert(final.add, key, _diff.add[key]);
        }

    if (!Object.keys(_diff.remove).length) delete final.remove;
    else
        for (const key in _diff.remove) {
            final.remove.push(key.replace(/\//gm, "."));
        }

    return final as KeyValueDiff;
}