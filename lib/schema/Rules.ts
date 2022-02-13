import { Entity, User } from ".";

export interface RuleSchema {
    [entityType: string]: {
        [attributeName: string]: AttributeRules;
    };
}

export type GetAccessor = (
    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User
) => any;

export interface AttributeRules {
    /**
     * Determines who can read this attribute
     *
     * @public Every user can read
     * @private Only the entity's owner can read
     * @internal No one can read, it's a server-only attribute
     */
    visibility: "public" | "private" | "internal";

    /**
     * Determines whether or not this attribute can be altered by the entity's owner
     */
    readonly: boolean;

    /**
     * Determines whether or not this method will be treated as a computed property
     */
    isGetAccessor: boolean;

    /**
     * Determines for how long this property will be cached before being updated again for users
     */
    cacheDuration: number;
}

/**
 * You know the rules, and so do I
 */
export abstract class Rules {
    /**
     * Lists all the rules
     */
    public static get schema() {
        return this._schema;
    }
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
    public static readonly default: AttributeRules = {
        visibility: "public",
        readonly: false,
        isGetAccessor: false,
        cacheDuration: 0
    };

    public static create(entityType: string, attributeName: string): AttributeRules {
        this.schema[entityType] ??= {};

        return (this.schema[entityType][attributeName] = {
            ...this.default,
            ...this.schema[entityType]?.[attributeName],
        });
    }
}
