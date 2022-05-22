import { RawEntity } from "../../sharedio"
import { EntityAttributeName } from "../../sharedio"
import { EntityRoleBooleanExpression } from "../../sharedio"

export type EntitySchemaAttribute<EntityType extends RawEntity> = {
    name: EntityAttributeName<EntityType>,
    type: string,
    initialValue: any,
    input: EntityRoleBooleanExpression<string[]>,
    output: EntityRoleBooleanExpression<string[]>,
    get: boolean,
    set: boolean,
    dependencies: EntityAttributeName<EntityType>[],
    binary: {
        input: number[],
        output: number[]
    }
}
export interface EntitySchema<EntityType extends RawEntity = any> {
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