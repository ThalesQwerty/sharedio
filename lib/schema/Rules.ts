import {
    Entity,
} from ".";
import {
    EntityAttributeRules,
    EntityRuleSchema,
    EntityAttributeName,
    KeyValue,
    SharedIOError,
    EntityVariant,
    EntityClassName,
    EntityVariantName,
    EntityUserAccessPolicy,
    EntityUserAccessPolicyClause,
    AllowedEntityVariant,
    DeniedEntityVariant
} from "../types";
import { User } from "./User";
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
        readability?: "public"|"internal"
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

            if (attributeRules.isVariant && (
                !readability ||
                (readability === "public" && attributeRules.accessPolicy.read[0] === undefined) ||
                (readability === "internal" && attributeRules.accessPolicy.read[0] === "!all")
            ))
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
        entityType: "Entity",
        attributeName: "",
        loaded: {
            read: false,
            write: false
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
            this.schema[entityType][attributeName] = {
                ...this.default,
                entityType,
                attributeName
            }
        }

        return this.schema[entityType][attributeName];
    }

    public static modifyAccessPolicy<EntityType extends Entity>(
        { accessPolicy, entityType, loaded, isMethod, isVariant }: EntityAttributeRules<EntityType>,
        changes: Partial<EntityUserAccessPolicy<EntityType>>,
    ) {
        for (const _action in accessPolicy) {
            const action =
                _action as keyof EntityUserAccessPolicy<EntityType>;

            if (changes[action]) accessPolicy[action].push(...changes[action] as any);

            process.nextTick(() => {
                if (!loaded[action]) {
                    loaded[action] = true;

                    if (isVariant) {
                        // attributes with @Type decorator are always @Public @Readonly

                        switch (action) {
                            case "read":
                                accessPolicy[action] = accessPolicy[action][0] === "!all" ? ["!all"] : ["all"];
                                break;
                            case "write":
                                accessPolicy[action] = [];
                                break;
                        }

                        return;
                    }

                    const unloadedAccessPolicy = _.uniq([...accessPolicy[action]]);

                    if (!unloadedAccessPolicy.length) {
                        // loads the default policy (@Public for attributes, @Private for methods)
                        switch (action) {
                            case "read":
                                accessPolicy[action] = isMethod ? ["owner"] : ["all"];
                                break;
                            case "write":
                                accessPolicy[action] = ["owner"];
                                break;
                        }

                        return;
                    }

                    // loads all modifiers into the access policy

                    const isWhitelist = unloadedAccessPolicy[0].substring(0, 1) !== "!";
                    if (isWhitelist) {
                        accessPolicy[action] = unloadedAccessPolicy.filter(variantName => variantName.substring(0, 1) !== "!") as EntityUserAccessPolicyClause;
                    } else {
                        accessPolicy[action] = unloadedAccessPolicy.filter(variantName => variantName.substring(0, 1) === "!") as EntityUserAccessPolicyClause;
                    }
                }
            });
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
        const variantList = [...rules.accessPolicy[action]] ?? [];

        const listShouldContainUser = !variantList.length || variantList[0].substring(0, 1) !== "!";

        const currentVariants =
            userOrEntityVariants instanceof User
                ? entityOrType instanceof Entity
                    ? userOrEntityVariants.variants(entityOrType)
                    : new SharedIOError(
                          `Rules.verify(): Third parameter cannot be of type "string" if first parameter is of type "User"`,
                      )
                : userOrEntityVariants;

        if (currentVariants instanceof SharedIOError)
            throw currentVariants;

        // Can't write if can't read, bro
        if (
            action === "write" &&
            !this.verify(
                currentVariants,
                "read",
                entityTypeName,
                attributeName,
            )
        )
            return false;

        const listContainsUser = !!_.intersection(currentVariants, variantList.map(name => name.replace("!", "")) as string[]).length;

        return listContainsUser === listShouldContainUser;
    }
}
