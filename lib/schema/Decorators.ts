import { Channel } from ".";
import { EntityAttributeName, EntityRoleBooleanExpression, EntitySchema, EntitySchemaAttribute, KeyValue } from "../types";
import { Entity } from "./Entity";
import { BuiltinRoles } from "./Roles";

function getSchema<EntityType extends Entity>(entity: EntityType) {
    return (entity.constructor as typeof Entity).schema;
}

function addUserRoles<EntityType extends Entity>(expression: string, schema: EntitySchema<EntityType>) {
    const roles = expression.replace(/\W+/g, " ").replace(/\s+/g, " ").trim().split(" ");

    roles.forEach(role => {
        if (!(role in schema.userRoles)) {
            schema.userRoles[role] = {
                name: role,
                value: Math.pow(2, Object.keys(schema.userRoles).length - 1)
            }
        }
    })
}

/**
 * Determines which user roles can write values into this property or call this method
 * @param expressions List of roles, or boolean expression involving roles
 */
export function inputFor<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: Expression extends EntityRoleBooleanExpression<string[]>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        const schema = getSchema(entity);
        const attributeSchema = schema.attributes[attributeName];

        const expression = expressions.map(expression => `(${expression})`).join("|");
        addUserRoles(expression, schema);

        if (!attributeSchema.input) attributeSchema.input = expression;
        else attributeSchema.input = `${attributeSchema.input} | (${expression})`;
    };
}

/**
 * Determines which user roles can read the value of this property or listen to calls of this method
 * @param expressions List of roles, or boolean expression involving roles
 */
export function outputFor<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: Expression extends EntityRoleBooleanExpression<string[]>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        const schema = getSchema(entity);
        const attributeSchema = schema.attributes[attributeName];

        const expression = expressions.map(expression => `(${expression})`).join("|");
        addUserRoles(expression, schema);

        if (!attributeSchema.output) attributeSchema.output = expression;
        else attributeSchema.output = `${attributeSchema.output} | (${expression})`;
    };
}

/**
 * Determines which user roles won't be able to view this property or this method
 * @param expressions List of roles, or boolean expression involving roles
 */
export function hiddenFor<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return outputFor(...expressions.map(expression => `!(${expression})`));
}

/**
 * Allows the owner of this entity to write values into this property or call this method
 *
 * Shorthand for: `@inputFor("owner")`
 */
export function input<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    inputFor(BuiltinRoles.OWNER)(entity, attributeName);
};

/**
 * Allows users to read the value of this property or listen to calls of this method.
 *
 * In case of channel entities, this only applies for users who are inside the channel.
 *
 * Shorthand for:
 *
 * `@outputFor("all")`, if normal entity
 *
 * `@outputFor("inside")`, if channel
 */
export function output<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    (entity instanceof Channel ? outputFor(BuiltinRoles.MEMBER) : outputFor(BuiltinRoles.USER))(entity, attributeName);
};

/**
 * Prevents all users from viewing this property or method. It exists only in the server.
 *
 * This is Shorthand for using no decorator at all.
 *
 * `@hiddenFor("all")`
 */
export function hidden<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    hiddenFor(BuiltinRoles.USER)(entity, attributeName);
};