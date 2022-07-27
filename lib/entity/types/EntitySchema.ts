import { Entity, EntityFlagName } from "../../sharedio"
import { EntityAttributeName } from "../../sharedio"
import { EntityRoleBooleanExpression } from "../../sharedio";

export type EntitySchemaAttribute<EntityType extends Entity, name extends string = EntityAttributeName<EntityType>> = {
    name: name,
    type: string,
    initialValue: any,
    input: EntityRoleBooleanExpression<string[]>,
    output: EntityRoleBooleanExpression<string[]>,
    get: boolean,
    set: boolean,
    async: boolean,
    dependencies: EntityAttributeName<EntityType>[],
    binary: {
        input: number[],
        output: number[]
    }
}

export type EntityFlag<EntityType extends Entity = Entity, name extends string = EntityFlagName<EntityType>> = {
    name: name,
    value: number,
    builtin: boolean,
    declared: boolean,
    used: boolean
}
export interface EntitySchema<EntityType extends Entity = any> {
    className: string,
    userRoles: {
        [name: string]: {
            name: string,
            value: number
        }
    },
    flags: {
        [name in EntityFlagName<EntityType>]: EntityFlag<EntityType>
    },
    attributes: { [name in EntityAttributeName<EntityType>]: EntitySchemaAttribute<EntityType, name> }
}