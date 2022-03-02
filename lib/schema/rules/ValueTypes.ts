import { EntityDecorator, prepareRuleSchema, Rules } from ".";
import { Entity, User } from "..";
import { EntityAttributeName, EntityAttributeType, EntityUserAccessPolicy } from "../../types";

/**
 * @SharedIO Rule Decorator
 *
 * Creates a custom user access policy
 */
export function EnforceValueType<EntityType extends Entity>(
    valueType: EntityAttributeType = "any",
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName);
        rules.valueType = valueType;

        process.nextTick(() => {

            switch (valueType) {
                case "number":
                case "string":
                case "boolean":
                    const next = rules.set;
                    rules.set = function (value: any, user?: User) {
                        if (typeof value === valueType) {
                            if (next) next.call(this, value, user);
                            else (this as any)[attributeName] = value;
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
 */
const Number: EntityDecorator = EnforceValueType("number");

/**
* @SharedIO Rule Decorator
*
* This attribute will only accept string values from user writes
*/
const String: EntityDecorator = EnforceValueType("string");

/**
* @SharedIO Rule Decorator
*
* This attribute will only accept boolean values from user writes
*/
const Boolean: EntityDecorator = EnforceValueType("boolean");

export { Number, String, Boolean };
