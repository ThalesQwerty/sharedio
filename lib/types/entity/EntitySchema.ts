import { Entity } from "../../schema";
import { EntityAttributeName } from "./EntityAttributes";
import { EntityRoleBooleanExpression } from "./EntityRoles";

export type EntitySchemaAttribute<EntityType extends Entity> = {
    name: EntityAttributeName<EntityType>,
    type: string,
    initialValue: any,
    input: EntityRoleBooleanExpression<string[]>,
    output: EntityRoleBooleanExpression<string[]>,
    get: boolean,
    set: boolean,
    dependencies: EntityAttributeName<EntityType>[],
}
export interface EntitySchema<EntityType extends Entity = any> {
    className: string,
    attributes: {[name in EntityAttributeName<EntityType>]: EntitySchemaAttribute<EntityType>}
}