/**
 * Classifies the main kinds of users in relation to an entity
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @insider All users who are inside the entity (only applies if the entity is a channel)
 * @all All users who may interact with the entity
 */
export type EntityUserRelation = "owner"|"host"|"insider"|"all";

/**
 * Allows (+) or denies (-) read/write access for an user class
 */
export type EntityUserAccessClauseModifier = "+"|"-";

/**
 * Allows (+) or denies (-) read/write access to an entity's attribute/method for an user class
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @insider All users who are inside the entity (only applies if the entity is a channel)
 * @all All users who may interact with the entity
 */
export type EntityUserAccessPolicyClause = `${EntityUserAccessClauseModifier}${EntityUserRelation|"all"}`;

/**
 * Specifies access rules for reading and writing an attribute
 */
export type EntityUserAccessPolicyModifier = {
    read?: EntityUserAccessPolicyClause[],
    write?: EntityUserAccessPolicyClause[]
};

export type EntityUserAccessPolicy = {
    read: EntityUserRelation[],
    write: EntityUserRelation[]
}

export interface EntityRuleSchema {
    [entityType: string]: {
        [attributeName: string]: EntityAttributeRules;
    };
}
export interface EntityAttributeRules {
    isDefaultAccessPolicy: {
        [clauseType in keyof EntityUserAccessPolicy]: boolean
    },

    /**
     * Determines who can read/write this attribute
     */
    accessPolicy: EntityUserAccessPolicy;

    /**
     * Determines whether or not this method will be treated as a computed property
     */
    isGetAccessor: boolean;

    /**
     * Determines for how long this property will be cached before being updated again for users
     */
    cacheDuration: number;
}