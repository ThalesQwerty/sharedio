import { EntityDecorator, prepareRuleSchema, Rules } from ".";
import { Entity, User } from "..";
import { EntityAttributeName, EntityAttributeRules, EntityAttributeType, EntitySetAccessor, EntityUserAccessPolicy, SharedIOError } from "../../types";

/**
 * @SharedIO Rule Decorator
 *
 * Creates a custom user access policy
 */
export function EnforceValueType(
    valueType: EntityAttributeType = "any",
    formatValue?: EntitySetAccessor
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName, false);
        rules.valueType = valueType;

        process.nextTick(() => {

            switch (valueType) {
                case "number":
                case "string":
                case "boolean":
                    const next = rules.set;
                    rules.set = function (value: any, user?: User) {
                        if (typeof value === valueType) {
                            if (next) next.call(entity, formatValue ? formatValue(value) : value, user);
                            else (entity as any)[attributeName] = value;
                        }
                    }
                    break;
            }

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
 * This attribute will only accept numeric values from user writes
 * @param min The lessest value accepted for this number (use `-Infinity` if you don't want a lower limit)
 * @param max The greatest value accepted for this number (use `Infinity` if you don't want a upper limit)
 */
export function Number(min: number = -Infinity, max: number = Infinity) {
    if (min > max) throw new SharedIOError("minGreaterThanMax", min, max);
    return EnforceValueType("number", function (value: number) {
        if (value < min) value = min;
        else if (value > max) value = max;
        return value;
    })
}

/**
 * @SharedIO Rule Decorator
 *
 * This attribute will only accept integer values from user writes
 * @param min The lessest value accepted for this number (use `-Infinity` if you don't want a lower limit)
 * @param max The greatest value accepted for this number (use `Infinity` if you don't want a upper limit)
 */
export function Integer(min: number = -Infinity, max: number = Infinity) {
    if (min > max) throw new SharedIOError("minGreaterThanMax", min, max);
    return EnforceValueType("number", function (value: number) {
        value = Math.trunc(value);
        if (value < min) value = min;
        else if (value > max) value = max;
        return value;
    })
}

/**
* @SharedIO Rule Decorator
*
* This attribute will only accept string values from user writes
*
* @param maxLength The maximum number of characters accepted for this string.
* If an user attempts to write a longer string, it will be truncated to fit into the maximum length. (use `Infinity` if you don't want to specify a limit)
*/
export function String(maxLength: number = Infinity) {
    return EnforceValueType("string", function (value: string) {
        return value.substring(0, maxLength);
    })
}

/**
* @SharedIO Rule Decorator
*
* Should users be able to set this attribute value to null?
*/
export function Nullable(isNullable: boolean = true) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName);

        process.nextTick(() => {

            const next = rules.set;
            rules.set = function (value: any, user?: User) {
                if (value === null) {
                    if (isNullable) {
                        (entity as any)[attributeName] = null;
                        next?.call(entity, value, user);
                    }
                } else {
                    next?.call(entity, value, user);
                }
            }
        });
    };
}


/**
* @SharedIO Rule Decorator
*
* This attribute will only accept boolean values from user writes
*/
const Boolean: EntityDecorator = EnforceValueType("boolean");

export { Boolean };
