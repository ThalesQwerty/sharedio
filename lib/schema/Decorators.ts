import { Entity, Rules, User } from ".";
import {
    SharedIOError,
    EntityWithAttribute,
    EntityAttributeName,
    GetAccessor,
    SetAccessor,
} from "../types";

function prepareSchema(entity: Entity, attributeName: string) {
    const type = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError(
            `Decorators cannot be applied to default member "${attributeName}" on entity ${type}.
            Please remove the decorators you've added and try to run your code again.`,
        );
    }

    return Rules.create(type, attributeName);
}

/**
 * @SharedIO Rule Decorator
 *
 * All users can read this attribute
 */
export function Public<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<name>,
) {
    const rules = prepareSchema(entity, attributeName);

    rules.visibility = "public";
}

/**
 * @SharedIO Rule Decorator
 *
 * Only the entity's owner can read this attribute
 */
export function Private<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<name>,
) {
    const rules = prepareSchema(entity, attributeName);

    rules.visibility = "private";
}

/**
 * @SharedIO Rule Decorator
 *
 * No user can read this attribute, it's server-side only
 */
export function Internal<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<name>,
) {
    const rules = prepareSchema(entity, attributeName);

    rules.visibility = "internal";
    rules.readonly = true;
}

/**
 * @SharedIO Rule Decorator
 *
 * Users are not allowed to edit this attribute
 */
export function Readonly<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<name>,
) {
    const rules = prepareSchema(entity, attributeName);

    rules.readonly = true;
}

/**
 * @SharedIO Rule Decorator
 *
 * Turns this method into a dynamically computed attribute
 *
 * You can pass an optional parameter of type User, that will be the user who's attempting to read this property (undefined if it's being read by the server)
 */
export function Get<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<name>,
    descriptor: TypedPropertyDescriptor<GetAccessor>,
) {
    const rules = prepareSchema(entity, attributeName);

    rules.isGetAccessor = true;
    rules.readonly = true;
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
export function Set<name extends string>(
    entity: EntityWithAttribute<name>,
    attributeName: EntityAttributeName<`_${name}`>,
    descriptor: TypedPropertyDescriptor<SetAccessor>,
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
    return function (
        entity: Entity,
        attributeName: EntityAttributeName,
    ) {
        const rules = prepareSchema(entity, attributeName);

        rules.cacheDuration = duration;
    };
}
