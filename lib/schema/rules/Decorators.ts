import _ from "lodash";
import { Entity, Rules } from "..";
import {
    SharedIOError,
    EntityAttributeName,
    EntityAttributeRules,
    EntityUserAccessPolicy,
    EntityAttributeType
} from "../../types";
import { EnforceValueType } from ".";
import "reflect-metadata";

export type EntityDecorator = <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
) => void;

export function prepareRuleSchema<EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
    getValueType: boolean = true
): EntityAttributeRules {
    const entityType = entity.constructor.name;

    if (Entity.isDefaultAttribute(attributeName)) {
        throw new SharedIOError("noDecoratorOnReservedAttribute", entityType, attributeName);
    }

    const rules = Rules.create(entityType, attributeName);

    if (getValueType) {
        let type = Reflect.getMetadata(
            "design:type",
            entity,
            attributeName
        ).name.toLowerCase() as EntityAttributeType;

        if (type === "object") type = "any";
        else if (type === "array") type = "any[]" as EntityAttributeType;
        else if (type === "function") {
            const paramTypes = Reflect.getMetadata(
                "design:paramtypes",
                entity,
                attributeName
            );

            const returnType = Reflect.getMetadata(
                "design:returntype",
                entity,
                attributeName
            );

            type = "() => void" as EntityAttributeType;

            console.log(attributeName, paramTypes, returnType);
        }

        rules.valueType = type;

        EnforceValueType(type)(entity, attributeName);
    }

    return rules;
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