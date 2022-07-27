import { KeyValue } from "../../sharedio";

const errors: KeyValue<(...args: any[]) => string, string> = {
    entityVariantNotFound (entityType: string, variants: string[]) {
        return `Entity of type ${entityType} does not have these variants: ${variants.map(name => `"${name}"`).join(", ")}\nPlease verify if you've actually declared those variants using the @Type decorator.`;
    },

    entityAttributesNotFound (entityType: string, attributeNames: string|string[]) {
        if (typeof attributeNames === "string") attributeNames = [attributeNames];
        return `Entity of type ${entityType} does not have the following attributes: ${attributeNames.map(name => `"${name}"`).join(", ")}`;
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
    },

    circularPropertyDepedency(propertyName: string) {
        return `Property "${propertyName}" cannot have itself as a dependency!`;
    },

    serverAndChannelUndefined() {
        return `"server" and "channel" attributes cannot be both undefined on EntityConfig`
    },

    flagIsUndeclared(flagName: string, entityType: string) {
        return `Flag "${flagName}" does not exist on entity ${entityType}. Please declare this flag in the entity using the @flag decorator.`
    },

    flagIsUnused(flagName: string, entityType: string) {
        return `Flag "${flagName}" declared on entity ${entityType} is useless. Please remove it or use the flag somewhere on the entity.`;
    }
}

export class SharedIOError extends Error {
    constructor(type: "entityVariantNotFound", entityName: string, variants: string[]);
    constructor(type: "noDecoratorOnReservedAttribute", entityType: string, attributeName: string);
    constructor(type: "noConcreteUserAndAbstractEntity");
    constructor(type: "minGreaterThanMax", min: number, max: number);
    constructor(type: "circularPropertyDepedency", propertyName: string);
    constructor(type: "entityAttributesNotFound", entityName: string, attributeNames: string|string[]);
    constructor(type: "serverAndChannelUndefined");
    constructor(type: "flagIsUndeclared", flagName: string, entityType: string);
    constructor(type: "flagIsUnused", flagName: string, entityType: string);

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
