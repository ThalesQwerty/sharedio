import { Channel, EntityFlag, EntityFlagName } from "../../sharedio";
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

function addFlags<EntityType extends Entity>(expression: string, schema: EntitySchema<EntityType>) {
    const flags = expression.replace(/\W+/g, " ").replace(/\s+/g, " ").trim().split(" ");

    const invalidCharacters = expression.replace(/\w+/g, "").replace(/\s+/g, "").replace(/\!|\||\&|\?|\:|\(|\)|\$/g, "").trim();

    if (invalidCharacters.length) {
        throw new Error(`Flag expression "${expression}" on entity ${schema.className} has invalid characters: ${invalidCharacters.split("").join(" ")}`);
    }

    console.log("flags found", flags);

    flags.forEach(_flagName => {
        const flagName = _flagName as EntityFlagName<EntityType>;

        schema.flags[flagName] ??= newFlag(schema, flagName);
        schema.flags[flagName].used = true;

    })
}

function newFlag<EntityType extends Entity = Entity>(schema: EntitySchema<EntityType>, name: EntityFlagName<EntityType>): EntityFlag<EntityType> {
    const constantFlagCount = (
        Object.keys(schema.flags) as EntityFlagName<EntityType>[]
    ).reduce((count, flagName) => count + (schema.flags[flagName].value ? 0 : 1), 0);

    return {
        name,
        value: Math.pow(2, Object.keys(schema.flags).length - constantFlagCount),
        used: false,
        declared: false,
        builtin: false,
    };
}

/**
 * Declares a boolean flag for this entity. 
 * 
 * Flags can be used to alter the entity's property behavior by using the `inputIf`, `outputIf` and `hiddenIf` decorators along with boolean expressions envolving the flags' values.
 * @param entity 
 * @param flagName 
 */
export function flag<EntityType extends Entity>(
    entity: EntityType,
    flagName: EntityFlagName<EntityType>
): void {
    const schema = getSchema(entity) as EntitySchema<EntityType>;

    schema.flags[flagName] ??= newFlag(schema, flagName);
    schema.flags[flagName].declared = true;
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
 * *Shorthand for:* `@inputIf("owned")`
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
export function inputIf<Expression extends string[] = string[]>(
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
        addFlags(expression, schema);

        if (!attributeSchema.input) attributeSchema.input = expression;
        else attributeSchema.input = `${attributeSchema.input} | (${expression})`;
    };
}

/**
 * Determines which user roles can read the value of this property or listen to calls of this method
 * @param expressions List of roles, or boolean expression involving roles
 */
export function outputIf<Expression extends string[] = string[]>(
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
        addFlags(expression, schema);

        if (!attributeSchema.output) attributeSchema.output = expression;
        else attributeSchema.output = `${attributeSchema.output} | (${expression})`;
    };
}

/**
 * Determines which user roles won't be able to view this property or this method
 * @param expressions List of roles, or boolean expression involving roles
 */
export function hiddenIf<Expression extends string[] = string[]>(
    ...expressions: Expression
) {
    return outputIf(...expressions.map(expression => `!(${expression})`));
}

/**
 * **For properties:** Allows only the entity owner to write values into this property and read its current value.
 *
 * **For methods:** Allows only the entity owner to call this method and listen to calls of this method.
 *
 * *Shorthand for:* `@inputIf("owned")`
 */
export function input<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    inputIf(BuiltinRoles.OWNER)(entity, attributeName);
};

/**
 * **For properties:** Allows all users to read its current value.
 *
 * **For methods:** Allows all users to listen to calls of this method.
 *
 * *Shorthand for:* `@outputIf("true")`
 */
export function output<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    outputIf(BuiltinRoles.USER)(entity, attributeName);
};

/**
 * **For properties:** Allows only the entity owner to read its current value.
 *
 * **For methods:** Allows only the entity owner to listen to calls of this method.
 *
 * *Shorthand for:* `@outputIf("owned")`
 */
export function hidden<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    hiddenIf(BuiltinRoles.OWNER)(entity, attributeName);
};

/**
 * **For properties:** Allows all users to write values into this property and read its current value. (Not advised, since it can create conflicts related to network latency)
 *
 * **For methods:** Allows all users to call this method and listen to calls of this method.
 *
 * *Shorthand for:* `@inputIf("true")`
 */
export function shared<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {
    inputIf(BuiltinRoles.USER)(entity, attributeName);
    outputIf(BuiltinRoles.USER)(entity, attributeName);
}