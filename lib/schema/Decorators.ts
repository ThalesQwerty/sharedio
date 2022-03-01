import _ from "lodash";
import { Entity, Rules } from ".";
import {
    SharedIOError,
    EntityAttributeName,
    EntityGetAccessor,
    EntitySetAccessor,
    KeyValue,
    EntityAttributeRules,
    EntityUserAccessPolicy,
    EntityVariant,
    EntityVariantName,
    AllowedEntityVariant,
    DeniedEntityVariant,
    EntityIntersectionVariantName,
    EntityIntersectionVariantCamelCaseName,
} from "../types";

const defaultUserAccessPolicy: EntityUserAccessPolicy = {
    read: ["all"],
    write: ["owner"],
};

const userAccessPolicyPresets: KeyValue<
    Partial<EntityUserAccessPolicy>,
    | "public"
    | "protected"
    | "private"
    | "internal"
    | "readonly"
    | "writable"
    | "controlled"
> = {
    public: {
        read: ["all"],
        write: [],
    },
    protected: {
        read: ["insider"],
        write: [],
    },
    private: {
        read: ["owner"],
        write: [],
    },
    internal: {
        read: ["!all"],
        write: [],
    },
    readonly: {
        read: [],
        write: ["!all"],
    },
    writable: {
        read: [],
        write: ["all"],
    },
    controlled: {
        read: ["host"],
        write: ["host"],
    },
};

type EntityDecorator = <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
) => void;

export { defaultUserAccessPolicy, userAccessPolicyPresets };

function prepareRuleSchema<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
): EntityAttributeRules {
    const type = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError(
            `Decorators cannot be applied to reserved member "${attributeName}" on entity ${type}.
            Please remove the decorators you've added and try to run your code again.`,
        );
    }

    return Rules.create(type, attributeName);
}

/**
 * @SharedIO Rule Decorator
 *
 * Creates a custom user access policy
 */
export function UsePolicy<EntityType extends Entity>(
    accessPolicyChanges: Partial<EntityUserAccessPolicy<EntityType>>,
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName);
        Rules.modifyAccessPolicy(rules, accessPolicyChanges as EntityUserAccessPolicy);

        if (typeof entity[attributeName] === "function") {
            if (!rules.hasGetAccessor && !rules.hasSetAccessor && !rules.isVariant)
                rules.isMethod = true;
        }
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * All users can read this attribute
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({read: ["+all"]})
 * ```
 */
const Public: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.public,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only users inside this channel can read this attribute
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({read: ["+insider"]})
 */
const Protected: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.protected,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only the entity's owner can read this attribute
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({read: ["+owner"]})
 * ```
 */
const Private: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.private,
);

/**
 * @SharedIO Rule Decorator
 *
 * No user can read this attribute, it's server-side only.
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({read: ["-all"]})
 * ```
 *
 * This decorator is optional, since it's also equivalent for using no decorator at all.
 */
const Internal: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.internal,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only the owner of the channel where this entity is in can read or write this attribute.
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({read: ["+host"], write: ["+host"]})
 * ```
 */
const Controlled: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.controlled,
);

/**
 * @SharedIO Rule Decorator
 *
 * Denies write access to all users (the attribute value can still be altered by the server, though)
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({write: ["-all"]})
 * ```
 */
const Readonly: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.readonly,
);

/**
 * @SharedIO Rule Decorator
 *
 * Grants write access to all users who can view this attribute
 *
 * NOTE: This is a dangerous policy, because it's the only one that can allow multiple users to edit simultaneously the same attribute, which can lead to latency issues. Don't use this decorator unless you're 100% sure about what you're doing.
 *
 * Equivalent to:
 * ```ts
 * UsePolicy({write: ["+all"]})
 * ```
 */
const Writable: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.writable,
);

/**
 * @SharedIO Rule Decorator
 *
 * Turns this method into a dynamically computed attribute
 *
 * You can pass an optional parameter of type User, that will be the user who's attempting to read this property (undefined if it's being read by the server)
 */
export function Get<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
    descriptor: TypedPropertyDescriptor<EntityGetAccessor>,
) {
    const rules = prepareRuleSchema(entity, attributeName);
    rules.hasGetAccessor = true;
    rules.isMethod = false;
    rules.methodImplementation = (entity as any)[attributeName];
}

/**
 * @SharedIO Rule Decorator
 *
 * Turns this into a watched attribute, which means a function will be called every time someone attempts to change it.
 *
 * The first parameter of the function is the new value attempting to be written.
 *
 * You can also pass an optional second parameter of type User, that will be the user who's attempting to read this property (undefined if it's being read by the server)
 *
 * All "set" accessors' names have to start with a underscore (_)
 */
export function Set<EntityType extends Entity>(
    entity: EntityType,
    attributeName: `_${EntityAttributeName<EntityType>}`,
    descriptor: TypedPropertyDescriptor<EntitySetAccessor>,
) {
    // to-do
}

/**
 * @SharedIO Rule Decorator
 *
 * Turns this into a cached attribute, which means its value will be updated to users no more often than every X milliseconds, in order to improve performance.
 *
 * This is specially useful for computed properties that envolve a lot of calculations and don't really need to be updated very often.
 *
 * @param duration The duration of the cache, in milliseconds (default is 1000)
 */
export function Cached(duration: number = 1000) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName);

        rules.cacheDuration = duration;
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * Declares a variant type of this entity.
 */
export function Type<EntityType extends Entity>(
    entity: EntityType,
    attributeName: Exclude<EntityVariantName<EntityType>, EntityIntersectionVariantCamelCaseName<EntityType>>,
    descriptor: TypedPropertyDescriptor<EntityVariant>,
) {
    const rules = prepareRuleSchema(
        entity,
        attributeName as EntityAttributeName<EntityType>,
    );

    rules.isVariant = true;
    rules.hasGetAccessor = true;
    rules.isMethod = false;
    rules.methodImplementation = (entity as any)[attributeName];
}

function verifyVariantOrFail(entity: Entity, variantName: EntityVariantName) {
    if (variantName === "all" || variantName === "host" || variantName === "insider" || variantName === "owner") return true;

    const entityType = entity.constructor.name;

    for (const subvariantName of (variantName as string).split("&")) {
        const rules = Rules.get(entityType, subvariantName);

        if (!rules || !rules.isVariant) throw new SharedIOError(`Variant "${subvariantName}" does not exist on entity of type "${entityType}". Verify if you've correctly declared this variant (you must use the @Type decorator).`)
    }

    return true;
}

/**
 * @SharedIO Rule Decorator
 *
 * This property will only be readable if this entity is of certain variants
 */
export function If<EntityVariantNames extends string[] = string[]>(
    ...variants: EntityVariantNames
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityVariantNames extends (EntityVariantName<EntityType>|EntityIntersectionVariantName<EntityType>)[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        setImmediate(() => variants.forEach(variantName => verifyVariantOrFail(entity, variantName as EntityVariantName)));
        return UsePolicy<EntityType>({
            read: variants.map(
                (variant) => `${variant}`,
            ) as AllowedEntityVariant<EntityType>[],
        })(entity, attributeName);
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * This property will not be readable if this entity is of certain variants
 */
export function Unless<
    EntityVariantNames extends string[] = string[],
>(...variants: EntityVariantNames) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityVariantNames extends (EntityVariantName<EntityType>|EntityIntersectionVariantName<EntityType>)[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        setImmediate(() => variants.forEach(variantName => verifyVariantOrFail(entity, variantName as EntityVariantName)));
        return UsePolicy<EntityType>({
            read: variants.map(
                (variant) => `!${variant}`,
            ) as DeniedEntityVariant<EntityType>[],
        })(entity, attributeName);
    };
}

export {
    Public,
    Private,
    Protected,
    Internal,
    Controlled,
    Readonly,
    Writable,
};
