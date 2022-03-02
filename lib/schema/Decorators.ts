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
    EntityIntersectionVariantCamelCaseName,
    EntityVariantBooleanExpression,
    EntityDefaultVariantName,
    EntitySetAcessorName,
} from "../types";
import { StringTransform } from "../utils";

const defaultUserAccessPolicy: EntityUserAccessPolicy = {
    read: "all",
    write: "owner",
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
        read: "all",
    },
    protected: {
        read: "inside",
    },
    private: {
        read: "owner",
    },
    internal: {
        read: "!all",
    },
    readonly: {
        write: "!all",
    },
    writable: {
        write: "all",
    },
    controlled: {
        read: "host",
        write: "host",
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
    const entityType = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError("noDecoratorOnReservedAttribute", entityType, attributeName);
    }

    return Rules.create(entityType, attributeName);
}

function verifyVariantOrFail(entity: Entity, variantName: EntityVariantName) {
    const entityType = entity.constructor.name;

    const subvariants = (variantName as string).replace(/[&!|()]/g, " ").trim().replace(/\s+/g, " ").split(" ");

    for (const subvariantName of subvariants) {
        if (subvariantName === "all" || subvariantName === "host" || subvariantName === "inside" || subvariantName === "owner") continue;

        const rules = Rules.get(entityType, subvariantName);

        if (!rules || !rules.isVariant) throw new SharedIOError("entityVariantNotFound", entityType, [subvariantName]);
    }

    return true;
}


function saveExpression<EntityType extends Entity>(entity: EntityType, attributeName: EntityAttributeName<EntityType>, expressions: string[], action: "read"|"write", clause: "if"|"unless" = "if") {
    setImmediate(() => expressions.forEach(variantName => verifyVariantOrFail(entity, variantName as EntityVariantName)));

    const unifiedExpression = expressions.map(expression => `(${expression})`).join("|");

    return UsePolicy<EntityType>({
        [action]: [clause === "if" ? unifiedExpression : `!(${unifiedExpression})`] as EntityVariantBooleanExpression[],
    })(entity, attributeName);
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
        Rules.change(rules, accessPolicyChanges as EntityUserAccessPolicy);
        process.nextTick(() => {
            Rules.finish(entity, attributeName);
        });

        if (typeof entity[attributeName] === "function") {
            if (!rules.get && !rules.set && !rules.isVariant)
                rules.isCallable = true;
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
 * @If("all")
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
 * @If("inside")
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
 * @If("owner")
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
 * @Unless("all")
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
 * @If("host") @WritableIf("host")
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
 * @WritableUnless("all")
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
 * @WritableIf("all")
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
    rules.get = (entity as any)[attributeName];
    rules.isCallable = false;

    process.nextTick(() => {
        Rules.finish(entity, attributeName);
    });
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
    attributeName: EntitySetAcessorName<EntityType>,
    descriptor: TypedPropertyDescriptor<EntitySetAccessor>
) {
    const originalAttributeName = StringTransform.undo("setAccessor", attributeName);

    const originalRules = prepareRuleSchema(entity, originalAttributeName as EntityAttributeName<EntityType>);
    originalRules.set = (entity as any)[attributeName];

    const { write } = originalRules.accessPolicy;

    const rules = prepareRuleSchema(entity, attributeName as EntityAttributeName<EntityType>);

    process.nextTick(() => {
        const newWritePolicies = rules.accessPolicy.read || "owner";
        originalRules.accessPolicy.write = write ? `(${write as string}) | (${newWritePolicies as string})` as EntityVariantBooleanExpression|"" : newWritePolicies;

        Rules.remove(entity, attributeName);
    });
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
        process.nextTick(() => {
            Rules.finish(entity, attributeName);
        });
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * Declares a variant type of this entity.
 */
export function Type<EntityType extends Entity>(
    entity: EntityType,
    attributeName: Exclude<EntityVariantName<EntityType>, EntityIntersectionVariantCamelCaseName<EntityType>|EntityDefaultVariantName>,
    descriptor: TypedPropertyDescriptor<EntityVariant>,
) {
    const rules = prepareRuleSchema(
        entity,
        attributeName as EntityAttributeName<EntityType>,
    );

    rules.isVariant = true;
    rules.get = (entity as any)[attributeName];
    rules.isCallable = false;
}

/**
 * @SharedIO Rule Decorator
 *
 * This property will only be readable if this entity is of certain variants
 */
export function If<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: Expression extends EntityVariantBooleanExpression<EntityType>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        return saveExpression(entity, attributeName, expressions, "read", "if");
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * This property will only be writable if this entity is of certain variants
 */
 export function WritableIf<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: Expression extends EntityVariantBooleanExpression<EntityType>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        return saveExpression(entity, attributeName, expressions, "write", "if");
    };
}


/**
 * @SharedIO Rule Decorator
 *
 * This property will NOT be readable if this entity is of certain variants
 */
export function Unless<
Expression extends string[] = string[],
>(...expressions: Expression) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: Expression extends EntityVariantBooleanExpression<EntityType>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        return saveExpression(entity, attributeName, expressions, "read", "unless");
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * This property will NOT be writable if this entity is of certain variants
 */
 export function WritableUnless<
 Expression extends string[] = string[],
 >(...expressions: Expression) {
     return function <EntityType extends Entity>(
         entity: EntityType,
         attributeName: Expression extends EntityVariantBooleanExpression<EntityType>[]
             ? EntityAttributeName<EntityType>
             : never,
     ) {
         return saveExpression(entity, attributeName, expressions, "write", "unless");
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
