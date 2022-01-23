import { Entity, Rules } from ".";
import { SharedIOError } from '../types';

function prepareSchemaAndGetType(entity: Entity, attributeName: string) {
    const type = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError(
            `Decorators cannot be applied to default member "${attributeName}" on entity ${type}.
            Please remove the decorators you've added and try to run your code again.`
        )
    }

    Rules.schema[type] ??= {};

    return type;
}

/**
 * @SharedIO Rule Decorator
 *
 * All users can read this attribute
 */
 export function Public(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity, attributeName);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        visibility: "public",
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * Only the entity's owner can read this attribute
 */
export function Private(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity, attributeName);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        visibility: "private",
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * No user can read this attribute, it's server-side only
 */
export function Internal(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity, attributeName);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        readonly: true,
        visibility: "internal",
    };
}

/**
 * @SharedIO Rule Decorator
 *
 * Users are not allowed to edit this attribute
 */
export function Readonly(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity, attributeName);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        readonly: true
    };
}
