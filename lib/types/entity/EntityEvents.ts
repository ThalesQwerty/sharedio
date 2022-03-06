import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { Entity, EntityState, User } from "../../schema";

interface EntityCreateEvent<EntityType extends Entity = Entity> {
    user: User;
    entity: EntityType;
}

interface EntityFailedCreateEvent<
    EntityType extends Entity = Entity,
> {
    user: User;
    entity: EntityType;
}

interface EntityDeleteEvent<EntityType extends Entity = Entity> {
    user: User;
    entity: EntityType;
}

interface EntityRenderEvent<EntityType extends Entity = Entity> {}

interface EntityChangeEvent<EntityType extends Entity = Entity> {
    entity: EntityType;
    changes: EntityState<EntityType>["changes"]
}

interface EntityBeforeDeleteEvent<
    EntityType extends Entity = Entity,
> {
    user: User;
    entity: EntityType;
}

export type EntityCreateListener<EntityType extends Entity = Entity> =
    (event: EntityCreateEvent<EntityType>) => void;
export type EntityFailedCreateListener<
    EntityType extends Entity = Entity,
> = (event: EntityFailedCreateEvent<EntityType>) => void;
type EntityBeforeDeleteListener<EntityType extends Entity = Entity> =
    (event: EntityBeforeDeleteEvent<EntityType>) => boolean;
type EntityDeleteListener<EntityType extends Entity = Entity> = (
    event: EntityDeleteEvent<EntityType>,
) => void;
type EntityRenderListener<EntityType extends Entity = Entity> = (
    event: EntityRenderEvent<EntityType>,
) => void;
type EntityChangeListener<EntityType extends Entity = Entity> = (
    event: EntityChangeEvent<EntityType>
) => void;
type EntityTickListener = () => void;

export interface EntityEvents<EntityType extends Entity = Entity> {
    beforeDelete?: EntityBeforeDeleteListener<EntityType>[];
    delete?: EntityDeleteListener<EntityType>[];
    render?: EntityRenderListener<EntityType>[];
    change?: EntityChangeListener<EntityType>[];
    tick?: EntityTickListener[];
    create?: EntityCreateListener<EntityType>[];
    afterCreate?: EntityCreateListener<EntityType>[];
    failedCreate?: EntityFailedCreateListener<EntityType>[];
}

type RemoveInterfaces<T> = Exclude<
    T,
    EntityListenerOverloads | EntityEmitterOverloads
>;
type ForceEntity<T, EntityType extends Entity = Entity> = RemoveInterfaces<T> extends EntityType
    ? RemoveInterfaces<T>
    : EntityType;

export interface EntityListenerOverloads<EntityType extends Entity = Entity>
    extends ListenerOverloads<EntityEvents<EntityType>> {
    /**
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    (
        event: "beforeDelete",
        callback: EntityBeforeDeleteListener<EntityType>,
    ): ForceEntity<this, EntityType>;

    /**
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    (
        event: "delete",
        callback: EntityDeleteListener<EntityType>,
    ): ForceEntity<this, EntityType>;

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
    ): ForceEntity<this, EntityType>;

    /**
     * Called whenever some property changes in this entity
     */
    (
        event: "change",
        callback: EntityChangeListener<EntityType>,
    ): ForceEntity<this, EntityType>;

    /**
     * Called after the entity is successfully created.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
    (
        event: "create",
        callback: EntityCreateListener<EntityType>,
    ): ForceEntity<this, EntityType>;

    /**
     * Called after the entity is successfully created and all "create" event listeners have been called.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
    (
        event: "afterCreate",
        callback: EntityCreateListener<EntityType>,
    ): ForceEntity<this, EntityType>;

    /**
     * If the entity fails to be created (_Constructor() returned false), this event will be emitted.
     */
    (
        event: "failedCreate",
        callback: EntityFailedCreateListener<EntityType>,
    ): ForceEntity<this, EntityType>;
}

export interface EntityEmitterOverloads<EntityType extends Entity = Entity>
    extends EmitterOverloads<EntityEvents<EntityType>> {
    (
        event: "beforeDelete",
        props: EntityBeforeDeleteEvent<EntityType>,
    ): boolean;
    (
        event: "delete",
        props: EntityDeleteEvent<EntityType>,
    ): void;
    (
        event: "render",
        props: EntityRenderEvent<EntityType>,
    ): void;
    (
        event: "change",
        props: EntityChangeEvent<EntityType>,
    ): void;
    (
        event: "create",
        props: EntityCreateEvent<EntityType>,
    ): void;
    (
        event: "failedCreate",
        props: EntityFailedCreateEvent<EntityType>,
    ): void;
}
