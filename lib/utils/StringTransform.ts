import _ from "lodash";

export class StringTransform {
    static setAccessor(original: string) {
        return `_${original}`;
    }

    static deniedVariant(original: string) {
        return `!${original}`;
    }

    static capitalize(original: string) {
        return _.capitalize(original);
    }

    static camelCase(original: string) {
        return _.camelCase(original);
    }

    /**
     * Reverts a string transformation, if possible.
     */
    static undo(method: Exclude<keyof typeof StringTransform, "undo"|"prototype"|"camelCase">, altered: string): string {
        switch (method) {
            case "setAccessor":
                if (altered[0] === "_") return altered.substring(1);
                else if (altered.substring(0, 3) === "set" && altered[3].toUpperCase() === altered[3]) {
                    const substring = altered.substring(3);
                    return substring.toUpperCase() === substring ? substring : this.undo("capitalize", altered.substring(3));
                }
                else return altered;
                break;
            case "deniedVariant":
                return altered.substring(1);
                break;
            case "capitalize":
                return altered[0].toLowerCase() + altered.substring(1);
                break;
            default:
                return altered;
                break;
        }
    }
}