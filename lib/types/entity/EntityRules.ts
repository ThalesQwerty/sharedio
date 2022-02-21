/**
 * Classifies the main kinds of users in relation to an entity
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @insider All users who are inside the entity (only applies if the entity is a channel)
 */
export type EntityUserRelation = "owner"|"host"|"insider";

/**
 * Allows (+) or denies (-) read/write access for an user class
 */
export type EntityUserAccessModifier = "+"|"-";

/**
 * Allows (+) or denies (-) read/write access to an entity's attribute/method for an user class
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @insider All users who are inside the entity (only applies if the entity is a channel)
 * @all All users who may interact with the entity
 */
export type EntityUserAccessPolicyClause = `${EntityUserAccessModifier}${EntityUserRelation|"all"}`;

/**
 * Specifies access rules for reading and writing an attribute
 */
export type EntityUserAccessPolicy = {
    read?: EntityUserAccessPolicyClause[],
    write?: EntityUserAccessPolicyClause[]
};

export interface EntityRuleSchema {
    [entityType: string]: {
        [attributeName: string]: EntityAttributeRules;
    };
}

export interface EntityAttributeRules {
    /**
     * Determines who can read this attribute
     *
     * @public Every user can read
     * @private Only the entity's owner can read
     * @internal No one can read, it's a server-only attribute
     */
    visibility: "public" | "private" | "internal";

    accessPolicy: EntityUserAccessPolicy;

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