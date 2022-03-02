import { prepareRuleSchema, Rules } from ".";
import { Entity } from "..";
import { EntityAttributeName, EntityGetAccessor, EntitySetAcessorName, EntitySetAccessor, EntityVariantBooleanExpression } from "../../types";
import { StringTransform } from "../../utils";

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