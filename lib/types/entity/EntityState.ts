import { Entity } from "../../schema";
import { EntityInterface } from "./EntityConfig";

export interface EntityState<EntityType extends Entity> {
    data: Partial<EntityInterface<EntityType>>,
    changes: Partial<EntityInterface<EntityType>>,
    hasChanges: boolean,
    readonly emitChanges: () => void
}