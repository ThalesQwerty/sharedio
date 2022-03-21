import { Rules, UsePolicy, prepareRuleSchema } from ".";
import { Entity } from "..";
import { EntityVariantName, SharedIOError, EntityAttributeName, EntityVariantBooleanExpression, EntityIntersectionVariantCamelCaseName, EntityDefaultVariantName, EntityVariant } from "../../types";

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
    setImmediate(() => expressions.forEach(variantName => verifyVariantOrFail(entity as EntityType extends Entity ? EntityType : Entity, variantName as EntityVariantName)));

    const unifiedExpression = expressions.map(expression => `(${expression})`).join("|");

    return UsePolicy<EntityType>({
        [action]: [clause === "if" ? unifiedExpression : `!(${unifiedExpression})`] as EntityVariantBooleanExpression[],
    })(entity, attributeName);
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