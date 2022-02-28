import {
    defaultUserAccessPolicy,
    Entity,
    userAccessPolicyPresets,
} from ".";
import {
    EntityAttributeRules,
    EntityRuleSchema,
    EntityAttributeName,
    KeyValue,
    SharedIOError,
    EntityVariant,
    EntityClassName,
} from "../types";
import { User } from "./User";
import {
    EntityUserAccessPolicyModifier,
    EntityVariantName,
    EntityUserAccessClauseModifier,
    EntityUserAccessPolicy,
} from "../types";
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
    public static from<EntityType extends Entity>(
        entityOrType: EntityClassName | EntityType,
    ) {
        return this.schema[Entity.getClassName(entityOrType)];
    }

    /**
     * Gets the rules from an entity attribute
     */
    public static get<EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ): EntityAttributeRules;

    /**
     * Gets the rules from an entity attribute
     */
    public static get(
        entityType: EntityClassName,
        attributeName: string,
    ): EntityAttributeRules;

    public static get<EntityType extends Entity>(
        entityOrType: EntityClassName | EntityType,
        attributeName: string,
    ): EntityAttributeRules {
        return (
            this.schema[Entity.getClassName(entityOrType)][
                attributeName as string
            ] ?? this.default
        );
    }

    public static variants<EntityType extends Entity>(
        entityOrType: EntityClassName | EntityType,
    ) {
        const rules = this.from(entityOrType);
        const variants: KeyValue<EntityVariant, EntityVariantName> = {
            all: () => true,
            owner: (user) => user?.owns(this as any) || false,
            host: () => false,
            insider: () => false,
        };

        for (const attributeName in rules) {
            const attributeRules = rules[attributeName];

            if (attributeRules.isVariant)
                variants[attributeName as EntityVariantName] =
                    attributeRules.methodImplementation as EntityVariant;
        }

        return variants as KeyValue<
            EntityVariant,
            EntityVariantName<EntityType>
        >;
    }

    /**
     * Default ruleset for entities.
     */
    public static get default() {
        return _.cloneDeep(this._default);
    }
    private static readonly _default: EntityAttributeRules = {
        isDefaultAccessPolicy: {
            read: true,
            write: true,
        },
        accessPolicy: {
            read: [],
            write: [],
        },
        isVariant: false,
        isMethod: false,
        hasSetAccessor: false,
        hasGetAccessor: false,
        cacheDuration: 0,
    };

    public static create(
        entityType: string,
        attributeName: string,
    ): EntityAttributeRules {
        this.schema[entityType] ??= {};

        if (!this.schema[entityType][attributeName]) {
            this.schema[entityType][attributeName] = this.default;
        }

        const rules = this.schema[entityType][attributeName];

        setTimeout(() => {
            let { read, write } = rules.accessPolicy;

            if (rules.isVariant) {
                rules.accessPolicy.read = ["all"],
                rules.accessPolicy.write = []
            }
            else {
                if (
                    (!read || !read.length) &&
                    rules.isDefaultAccessPolicy.read
                ) {
                    read.push(...defaultUserAccessPolicy.read);
                }
                if (
                    (!write || !write.length) &&
                    rules.isDefaultAccessPolicy.write
                ) {
                    write.push(...defaultUserAccessPolicy.write);
                }
            }
        }, 0);

        return this.schema[entityType][attributeName];
    }

    public static modifyAccessPolicy<EntityType extends Entity>(
        { accessPolicy, isDefaultAccessPolicy }: EntityAttributeRules,
        modifier: EntityUserAccessPolicyModifier<EntityType>,
    ) {
        for (const _clauseType in modifier) {
            const clauseType =
                _clauseType as keyof EntityUserAccessPolicyModifier<EntityType>;
            const clauses = modifier[clauseType] ?? [];

            let implicitAll = false;
            let allowedEntityVariants = accessPolicy[clauseType];

            if (clauses.length) {
                implicitAll =
                    isDefaultAccessPolicy[clauseType] &&
                    allowedEntityVariants.length === 0;
                isDefaultAccessPolicy[clauseType] = false;
            }

            for (const clause of clauses) {
                const accessModifier = clause.substring(
                    0,
                    1,
                ) as EntityUserAccessClauseModifier;
                const relationName = clause.substring(
                    1,
                ) as EntityVariantName;

                switch (accessModifier) {
                    case "+":
                        if (
                            !allowedEntityVariants.find(
                                (name) => name === relationName,
                            )
                        )
                            allowedEntityVariants.push(relationName);
                        break;
                    case "-":
                        if (implicitAll)
                            allowedEntityVariants.push("all");
                        allowedEntityVariants =
                            allowedEntityVariants.filter(
                                (name) => name !== relationName,
                            );
                        break;
                }
            }

            accessPolicy[clauseType] = allowedEntityVariants;
        }

        return accessPolicy;
    }

    /**
     * Verifies if a specific user can read or write an entity attribute
     */
    public static verify<EntityType extends Entity>(
        user: User,
        action: keyof EntityUserAccessPolicy,
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ): boolean;

    /**
     * Verifies if some user would be able read or write an entity attribute, given its relation to the entity
     */
    public static verify<EntityType extends Entity>(
        entityVariants: EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ): boolean;

    /**
     * Verifies if some user would be able read or write an entity attribute, given its relation to the entity and the entity type
     */
    public static verify<EntityType extends Entity>(
        entityVariants: EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entity: EntityClassName,
        attributeName: string,
    ): boolean;

    public static verify<EntityType extends Entity>(
        userOrEntityVariants: User | EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entityOrType: EntityType | EntityClassName,
        attributeName: string,
    ): boolean {
        const entityTypeName = Entity.getClassName(entityOrType);

        const rules = Rules.get(entityTypeName, attributeName);
        const clauses = [...rules.accessPolicy[action]] ?? [];

        const entityVariants =
            userOrEntityVariants instanceof User
                ? entityOrType instanceof Entity
                    ? userOrEntityVariants.variants(entityOrType)
                    : new SharedIOError(
                          `Rules.verify(): Third parameter cannot be of type "string" if first parameter is of type "User"`,
                      )
                : userOrEntityVariants;

        if (entityVariants instanceof SharedIOError)
            throw entityVariants;

        // Can't write if can't read, bro
        if (
            action === "write" &&
            !this.verify(
                entityVariants,
                "read",
                entityTypeName,
                attributeName,
            )
        )
            return false;

        let allowedEntityVariants: EntityVariantName[] = clauses;

        return !!_.intersection(entityVariants, allowedEntityVariants)
            .length;
    }
}
