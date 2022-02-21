import { Entity, userAccessPolicyPresets } from ".";
import { EntityAttributeRules, EntityRuleSchema, EntityAttributeName, KeyValue } from '../types';
import { User } from './User';
import { EntityUserAccessPolicy, EntityUserRelation, EntityUserAccessModifier } from '../types/entity/EntityRules';
import _ from "lodash";

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
    private static _schema: EntityRuleSchema = {};

    /**
     * Gets the rules from an entity
     */
     public static from(entity: Entity) {
        return this.schema[entity.type];
    }

    /**
     * Gets the rules from an entity attribute
     */
    public static get<EntityType extends Entity>(entity: EntityType, attributeName: EntityAttributeName<EntityType>) {
        return this.schema[entity.type][attributeName as string];
    }

    /**
     * Default ruleset for entities
     */
    public static get default() { return _.cloneDeep(this._default) };

    private static readonly _default: EntityAttributeRules = {
        visibility: "public",
        accessPolicy: {
            read: [],
            write: []
        },
        readonly: false,
        isGetAccessor: false,
        cacheDuration: 0
    };

    public static create(entityType: string, attributeName: string): EntityAttributeRules {
        this.schema[entityType] ??= {};

        if (!this.schema[entityType][attributeName]) {
            this.schema[entityType][attributeName] = this.default;
        }

        const rules = this.schema[entityType][attributeName];

        setTimeout(() => {
            let { read, write } = rules.accessPolicy;

            if (!read || !read.length) {
                rules.accessPolicy.read = [...(userAccessPolicyPresets.default.read ?? [])];
            }
            if (!write || !write.length) {
                rules.accessPolicy.write = [...(userAccessPolicyPresets.default.write ?? [])];
            }
        }, 0);

        return this.schema[entityType][attributeName];
    }

    /**
     * Verifies if a specific user can read or write an entity attribute
     */
    public static verify<EntityType extends Entity>(user: User, action: keyof EntityUserAccessPolicy, entity: EntityType, attributeName: EntityAttributeName<EntityType>, debug?: boolean): boolean

     /**
     * Verifies if some user would be able read or write an entity attribute, given its relation to the entity
     */
    public static verify<EntityType extends Entity>(userRelation: EntityUserRelation[], action: keyof EntityUserAccessPolicy, entity: EntityType, attributeName: EntityAttributeName<EntityType>, debug?: boolean): boolean


    public static verify<EntityType extends Entity>(userOrRelation: User|EntityUserRelation[], action: keyof EntityUserAccessPolicy, entity: EntityType, attributeName: EntityAttributeName<EntityType>, debug: boolean = false): boolean {
        const rules = Rules.get(entity, attributeName);
        const clauses = rules.accessPolicy[action] ?? [];

        const userRelations = userOrRelation instanceof User ? userOrRelation.relations(entity) : userOrRelation;

        // Can't write if can't read, bro
        if (action === "write" && !this.verify(userRelations, "read", entity, attributeName)) return false;

        let allowedUserRelations: EntityUserRelation[] = [];

        for (const clause of clauses) {
            const accessModifier = clause.substring(0, 1) as EntityUserAccessModifier;
            const relationName = clause.substring(1) as EntityUserRelation;

            switch (accessModifier) {
                case "+":
                    if (!allowedUserRelations.find(name => name === relationName)) allowedUserRelations.push(relationName);
                    break;
                case "-":
                    allowedUserRelations = allowedUserRelations.filter(name => name !== relationName);
                    break;
            }
        }

        userRelations.push("all" as EntityUserRelation);

        return !!_.intersection(userRelations, allowedUserRelations).length;
    }
}
