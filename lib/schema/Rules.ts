import { Entity } from ".";

export interface RuleSchema {
    [entityType: string]: {
        [attributeName: string]: AttributeRules
    }
}

export interface AttributeRules {
    /**
     * Determines who can read this attribute
     *
     * @public Every user can read
     * @private Only the entity's owner can read
     * @internal No one can read, it's a server-only attribute
     */
    visibility: "public"|"private"|"internal",

    /**
     * Determines whether or not this attribute can be altered by the entity's owner
     */
    readonly: boolean
}

/**
 * You know the rules, and so do I
 */
export class Rules {
    /**
     * Lists all the rules
     */
    public static get schema() { return this._schema };
    private static _schema: RuleSchema = {};

    /**
     * Gets the rules from a given entity
     */
    public static from(entity: Entity) {
        return this.schema[entity.type] ?? this.default;
    }

    /**
     * Default ruleset for entities
     */
    public static get default(): AttributeRules {
        return {
            visibility: "public",
            readonly: false
        };
    }

    public static spread(entityType: string, attributeName: string) {
        return {
            ...this.default,
            ...this.schema[entityType]?.[attributeName]
        };
    }
}