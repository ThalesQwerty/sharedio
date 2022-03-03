import { KeyValue } from ".";

const errors: KeyValue<(...args: any[]) => string, string> = {
    entityVariantNotFound (entityType: string, variants: string[]) {
        return `Entity of type ${entityType} does not have these variants: ${variants.map(name => `"${name}"`).join(", ")}\nPlease verify if you've actually declared those variants using the @Type decorator.`;
    },

    noDecoratorOnReservedAttribute(entityType: string, attributeName: string) {
        return `Decorators cannot be applied to reserved member "${attributeName}" on entity ${entityType}.
        Please remove the decorators you've added and try to run your code again.`;
    },

    noConcreteUserAndAbstractEntity () {
        return `Rules.verify(): Third parameter cannot be of type "string" if first parameter is of type "User"`;
    },

    minGreaterThanMax(min: number, max: number) {
        return `Minimum value (${min}) cannot be greater than maximum value (${max})!`;
    }
}

export class SharedIOError extends Error {
    constructor(type: "entityVariantNotFound", entityName: string, variants: string[]);
    constructor(type: "noDecoratorOnReservedAttribute", entityType: string, attributeName: string);
    constructor(type: "noConcreteUserAndAbstractEntity");
    constructor(type: "minGreaterThanMax", min: number, max: number)

    constructor(type?: string, ...args: any[]) {
        if (!type) super();
        else {
            const getError = errors[type];
            if (getError) super(getError(...args));
            else super();
        }
        this.name = "SharedIOError";
    }
}
