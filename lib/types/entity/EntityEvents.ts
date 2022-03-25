import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { Channel, Entity, User } from "../../schema";
import { EntityState } from "..";

export interface EntityCreateEvent<EntityType extends Entity = Entity> {
    user: User|null;
    entity: EntityType;
}

export interface EntityFailedCreateEvent<
    EntityType extends Entity = Entity,
> {
    user: User|null;
    entity: EntityType;
}

export interface EntityDeleteEvent<EntityType extends Entity = Entity> {
    user: User|null;
    entity: EntityType;
}

export interface EntityRenderEvent<EntityType extends Entity = Entity> {}



export interface EntityChangeEvent<EntityType extends Entity = Entity> {
    entity: EntityType;
    changes: EntityState<EntityType extends Entity ? EntityType : Entity>["changes"]
}

export interface EntityCanDeleteEvent<
    EntityType extends Entity = Entity,
> {
    user: User|null;
    entity: EntityType;
}

export type EntityCreateListener<EntityType extends Entity = Entity> =
    (event: EntityCreateEvent<EntityType>) => void;
export type EntityFailedCreateListener<
    EntityType extends Entity = Entity,
> = (event: EntityFailedCreateEvent<EntityType>) => void;
export type EntityCanDeleteListener<EntityType extends Entity = Entity> =
    (event: EntityCanDeleteEvent<EntityType>) => boolean;
    export type EntityDeleteListener<EntityType extends Entity = Entity> = (
    event: EntityDeleteEvent<EntityType>,
) => void;
export type EntityRenderListener<EntityType extends Entity = Entity> = (
    event: EntityRenderEvent<EntityType>,
) => void;
export type EntityChangeListener<EntityType extends Entity = Entity> = (
    event: EntityChangeEvent<EntityType>
) => void;
export type EntityTickListener = () => void;

// type Trap<T extends (...args: any[]) => any> = (...args: Parameters<T>) => boolean;

export interface EntityEvents<EntityType extends Entity = Entity> {
    "canDelete?"?: EntityCanDeleteListener<EntityType>[];
    delete?: EntityDeleteListener<EntityType>[];
    render?: EntityRenderListener<EntityType>[];
    change?: EntityChangeListener<EntityType>[];
    tick?: EntityTickListener[];
    create?: EntityCreateListener<EntityType>[];
    failedCreate?: EntityFailedCreateListener<EntityType>[];
}

export interface EntityListenerOverloads<EntityType extends Entity = Entity>
    extends ListenerOverloads<EntityEvents<EntityType>> {
    /**
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    (
        event: "canDelete?",
        callback: EntityCanDeleteListener<EntityType>,
    ): EntityType;

    /**
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    (
        event: "delete",
        callback: EntityDeleteListener<EntityType>,
    ): EntityType;

    /**
     * This function will be called every server tick.
     */
    (event: "tick", callback: EntityTickListener): EntityType;

    /**
     * Called before an user reads this entity's properties.
     */
    (
        event: "render",
        callback: EntityRenderListener<EntityType>,
    ): EntityType;

    /**
     * Called whenever some property changes in this entity
     */
    (
        event: "change",
        callback: EntityChangeListener<EntityType>,
    ): EntityType;

    /**
     * Called after the entity is successfully created.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
    (
        event: "create",
        callback: EntityCreateListener<EntityType>,
    ): EntityType;

    /**
     * If the entity fails to be created (_Constructor() returned false), this event will be emitted.
     */
    (
        event: "failedCreate",
        callback: EntityFailedCreateListener<EntityType>,
    ): EntityType;
}
export interface EntityEmitterOverloads<EntityType extends Entity = Entity>
    extends EmitterOverloads<EntityEvents<EntityType>> {
    (
        event: "canDelete?",
        props: EntityCanDeleteEvent<EntityType>,
    ): boolean;
    (
        event: "delete",
        props: EntityDeleteEvent<EntityType>,
    ): true;
    (
        event: "render",
        props: EntityRenderEvent<EntityType>,
    ): true;
    (
        event: "change",
        props: EntityChangeEvent<EntityType>,
    ): true;
    (
        event: "create",
        props: EntityCreateEvent<EntityType>,
    ): true;
    (
        event: "failedCreate",
        props: EntityFailedCreateEvent<EntityType>,
    ): true;
}
