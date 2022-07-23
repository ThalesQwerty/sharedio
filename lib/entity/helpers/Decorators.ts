import { Channel } from "../../sharedio";
import { Entity } from "../../sharedio";
import { BuiltinRoles } from "../../sharedio";
import { EntityAttributeName } from "../../sharedio";
import { EntityRoleBooleanExpression } from "../../sharedio";
import { EntitySchema } from "../../sharedio";

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
 * Disables automatic synchronization with user clients for this property/method.
 *
 * **For properties:** When this property is changed, the new value won't be automatically synchronized with the user clients.
 * It would have to be done manually by calling the entitiy's `$output()` method.
 *
 * **For methods:** User clients won't be able to listen to calls of this function, regardless of whether being able or not to call it themselves.
 *
 * This is useful for handling some edge cases, such as:
 * - Avoiding a computationally expensive getter from being calculated more often than necessary
 * - Creating a method that doesn't generate side effects on other users' clients
 *
 * *Shorthand for:* `@inputFor("owner")`
 */
 export function async<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    const schema = getSchema(entity);
    const attributeSchema = schema.attributes[attributeName];

    attributeSchema.async = true;
};

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
 * **For properties:** Allows only the entity owner to write values into this property and read its current value.
 *
 * **For methods:** Allows only the entity owner to call this method and listen to calls of this method.
 *
 * *Shorthand for:* `@inputFor("owner")`
 */
export function input<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    inputFor(BuiltinRoles.OWNER)(entity, attributeName);
};

/**
 * **For properties:** Allows all users to read its current value.
 *
 * **For methods:** Allows all users to listen to calls of this method.
 *
 * *Shorthand for:* `@outputFor("all")`
 */
export function output<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    outputFor(BuiltinRoles.USER)(entity, attributeName);
};

/**
 * **For properties:** Allows only the entity owner to read its current value.
 *
 * **For methods:** Allows only the entity owner to listen to calls of this method.
 *
 * *Shorthand for:* `@outputFor("only")`
 */
export function hidden<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    hiddenFor(BuiltinRoles.OWNER)(entity, attributeName);
};

/**
 * **For properties:** Allows all users to write values into this property and read its current value. (Not advised, since it can create conflicts related to network latency)
 *
 * **For methods:** Allows all users to call this method and listen to calls of this method.
 *
 * *Shorthand for:* `@inputFor("all")`
 */
 export function shared<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    inputFor(BuiltinRoles.USER)(entity, attributeName);
    outputFor(BuiltinRoles.USER)(entity, attributeName);
}