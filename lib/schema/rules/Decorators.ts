import _ from "lodash";
import { Entity, Rules } from "..";
import {
    SharedIOError,
    EntityAttributeName,
    EntityAttributeRules,
    EntityUserAccessPolicy,
} from "../../types";

export function prepareRuleSchema<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
): EntityAttributeRules {
    const entityType = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError("noDecoratorOnReservedAttribute", entityType, attributeName);
    }

    return Rules.create(entityType, attributeName);
}

/**
 * @SharedIO Rule Decorator
 *
 * Creates a custom user access policy
 */
export function UsePolicy<EntityType extends Entity>(
    accessPolicyChanges: Partial<EntityUserAccessPolicy<EntityType>>,
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: EntityAttributeName<EntityType>,
    ) {
        const rules = prepareRuleSchema(entity, attributeName);
        Rules.change(rules, accessPolicyChanges as EntityUserAccessPolicy);
        process.nextTick(() => {
            Rules.finish(entity, attributeName);
        });

        if (typeof entity[attributeName] === "function") {
            if (!rules.get && !rules.set && !rules.isVariant)
                rules.isCallable = true;
        }
    };
}