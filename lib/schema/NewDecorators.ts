import { Channel } from ".";
import { EntityAttributeName } from "../types";
import { Entity } from "./Entity";

/**
 * Every user who can see this entity will be able to read this property or call this method.
 */
export function _public <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    const schema = (entity.constructor as typeof Entity).schema.attributes[attributeName];
    schema.visibility = "public";
};

/**
 * Only users inside this channel will be able to read this property or call this method.
 */
 export function _protected <ChannelType extends Entity>(
    entity: ChannelType,
    attributeName: EntityAttributeName<ChannelType>
) {
    const schema = (entity.constructor as typeof Entity).schema.attributes[attributeName];
    schema.visibility = "protected";
};

/**
 * Only the owner of this entity will be able to read this property or call this method.
 */
 export function _private <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    const schema = (entity.constructor as typeof Entity).schema.attributes[attributeName];
    schema.visibility = "private";
};

/**
 * No user will be able to read this property or call this method. This is equivalent to not using decorators at all.
 */
 export function _internal <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    const schema = (entity.constructor as typeof Entity).schema.attributes[attributeName];
    schema.visibility = "internal";
};

/**
 * This property cannot have its value changed by the owner.
 */
 export function _readonly <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    const schema = (entity.constructor as typeof Entity).schema.attributes[attributeName];
    schema.readonly = true;

    if (schema.visibility === "internal") schema.visibility = "public";
};
