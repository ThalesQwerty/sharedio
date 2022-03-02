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
    EntityVariantBooleanExpression,
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

    public static remove<EntityType extends Entity>(entityType: EntityClassName | EntityType, attributeName?: string) {
        const entityTypeName = Entity.getClassName(entityType);
        if (this._schema[entityTypeName]) {
            if (attributeName) delete this._schema[entityTypeName][attributeName];
            else delete this._schema[entityTypeName];
        }

        console.log(entityTypeName);
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
            inside: () => false,
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
            read: "",
            write: "",
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

            if (changes[action]) accessPolicy[action] += accessPolicy[action] ? `|(${changes[action]})` : changes[action];

            process.nextTick(() => {
                if (!loaded[action]) {
                    loaded[action] = true;

                    if (isVariant) {
                        // attributes with @Type decorator are always @Public @Readonly

                        switch (action) {
                            case "read":
                                accessPolicy[action] = accessPolicy[action] === "!all" ? "!all" : "all";
                                break;
                            case "write":
                                accessPolicy[action] = "";
                                break;
                        }
                    }

                    if (accessPolicy[action] === "") {
                        switch (action) {
                            case "read":
                                accessPolicy[action] = "all";
                                break;
                            case "write":
                                accessPolicy[action] = "owner";
                                break;
                        }
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
        attributeName: EntityAttributeName<EntityType>
    ): boolean;

    /**
     * Verifies if some user would be able read or write an entity attribute, given its relation to the entity
     */
    public static verify<EntityType extends Entity>(
        entityVariants: EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
        safe?: boolean
    ): boolean;

    /**
     * Verifies if some user would be able read or write an entity attribute, given its relation to the entity and the entity type
     */
    public static verify<EntityType extends Entity>(
        entityVariants: EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entity: EntityClassName,
        attributeName: string,
        safe?: boolean
    ): boolean;

    public static verify<EntityType extends Entity>(
        userOrEntityVariants: User | EntityVariantName<EntityType>[],
        action: keyof EntityUserAccessPolicy,
        entityOrType: EntityType | EntityClassName,
        attributeName: string,
        safe: boolean = true
    ): boolean {
        const entityTypeName = Entity.getClassName(entityOrType);

        const { accessPolicy } = Rules.get(entityTypeName, attributeName);

        const currentVariants =
            userOrEntityVariants instanceof User
                ? entityOrType instanceof Entity
                    ? userOrEntityVariants.variants(entityOrType)
                    : new SharedIOError("noConcreteUserAndAbstractEntity")
                : userOrEntityVariants;

        if (currentVariants instanceof SharedIOError)
            throw currentVariants;

        if (
            action === "write" &&
            !this.verify(
                currentVariants,
                "read",
                entityTypeName,
                attributeName,
                safe
            )
        )
            return false;

        return this.test(currentVariants, entityTypeName, accessPolicy[action]);
    }

    public static test(currentVariants: string[], entityType: EntityClassName, expression: EntityVariantBooleanExpression|"", possibleVariants?: string[], debug:boolean = false) {
        if (!expression) return false;

        const entityTypeName = Entity.getClassName(entityType);

        possibleVariants ??= Object.keys(Rules.variants(entityTypeName));

        // needs to be sorted by length (descending), in order to avoid some bugs in the regex
        // ex: type "ally" contains the string "all" in it, so "ally" has to be checked before "all"
        possibleVariants.sort((a, b) => a.length < b.length ? 1 : -1);

        let booleanExpression: string = expression;

        for (const variantName of possibleVariants) {
            booleanExpression = booleanExpression.replace(new RegExp(variantName, "g"), currentVariants.indexOf(variantName as EntityVariantName) >= 0 ? "1" : "0");
        }

        const invalidVariants = booleanExpression.replace(/[01]/g, "").replace(/[&!|()]/g, " ").trim().replace(/\s+/, ", ");

        if (invalidVariants !== "") {
            throw new SharedIOError("entityVariantNotFound", entityTypeName, invalidVariants.split(", "))
        }

        const passed = !!eval(booleanExpression);

        if (debug) console.log(currentVariants, expression, "   --> ", booleanExpression, "=", passed);

        return passed;
    }
}
