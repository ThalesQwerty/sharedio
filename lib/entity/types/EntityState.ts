import { Entity } from "../../sharedio";
import { EntityInterface } from "../../sharedio";

export interface EntityState<EntityType extends Entity> {
    data: Partial<EntityInterface<EntityType>>,
    changes: Partial<EntityInterface<EntityType>>,
    hasChanges: boolean,
    readonly emitChanges: () => void
}