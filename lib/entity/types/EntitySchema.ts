import { Entity } from "../../sharedio"
import { EntityAttributeName } from "../../sharedio"
import { EntityRoleBooleanExpression } from "../../sharedio"

export type EntitySchemaAttribute<EntityType extends Entity> = {
    name: EntityAttributeName<EntityType>,
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
export interface EntitySchema<EntityType extends Entity = any> {
    className: string,
    userRoles: {
        [name: string]: {
            name: string,
            value: number
        }
    },
    isChannel: boolean,
    attributes: {[name in EntityAttributeName<EntityType>]: EntitySchemaAttribute<EntityType>}
}