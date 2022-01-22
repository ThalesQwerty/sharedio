import { Entity, Rules } from ".";

function prepareSchemaAndGetType(entity: Entity) {
    const type = entity.constructor.name;

    Rules.schema[type] ??= {};

    return type;
}

/**
 * All users can read this attribute
 */
 export function Public(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        visibility: "public",
    };
}

/**
 * Only the entity's owner can read this attribute
 */
export function Private(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        visibility: "private",
    };
}

/**
 * No user can read this attribute, it's server-side only
 */
export function Internal(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        visibility: "internal",
    };
}

/**
 * Users are not allowed to edit this attribute
 */
export function Readonly(entity: Entity, attributeName: string) {
    const type = prepareSchemaAndGetType(entity);

    Rules.schema[type][attributeName] = {
        ...Rules.spread(type, attributeName),
        readonly: true
    };
}
