import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { Entity, User } from "../../schema";

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

interface EntityUpdateEvent<EntityType extends Entity = Entity> {}

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
type EntityUpdateListener<EntityType extends Entity = Entity> = (
    event: EntityUpdateEvent<EntityType>,
) => void;
type EntityTickListener = () => void;

export interface EntityEvents {
    beforeDelete?: EntityBeforeDeleteListener[];
    delete?: EntityDeleteListener[];
    render?: EntityRenderListener[];
    update?: EntityUpdateListener[];
    tick?: EntityTickListener[];
    create?: EntityCreateListener[];
    afterCreate?: EntityCreateListener[];
    failedCreate?: EntityFailedCreateListener[];
}

type RemoveInterfaces<T> = Exclude<
    T,
    EntityListenerOverloads | EntityEmitterOverloads
>;
type ForceEntity<T> = RemoveInterfaces<T> extends Entity
    ? RemoveInterfaces<T>
    : Entity;

export interface EntityListenerOverloads
    extends ListenerOverloads<EntityEvents> {
    /**
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    (
        event: "beforeDelete",
        callback: EntityBeforeDeleteListener,
    ): ForceEntity<this>;

    /**
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    (
        event: "delete",
        callback: EntityDeleteListener,
    ): ForceEntity<this>;

    /**
     * This function will be called every server tick.
     */
    (event: "tick", callback: EntityTickListener): ForceEntity<this>;

    /**
     * Called before an user reads this entity's properties.
     */
    (
        event: "render",
        callback: EntityRenderListener,
    ): ForceEntity<this>;

    /**
     * Called before an user reads this entity's properties.
     */
    (
        event: "update",
        callback: EntityUpdateListener,
    ): ForceEntity<this>;

    /**
     * Called after the entity is successfully created.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
    (
        event: "create",
        callback: EntityCreateListener,
    ): ForceEntity<this>;

    /**
     * Called after the entity is successfully created and all "create" event listeners have been called.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
    (
        event: "afterCreate",
        callback: EntityCreateListener,
    ): ForceEntity<this>;

    /**
     * If the entity fails to be created (_Constructor() returned false), this event will be emitted.
     */
    (
        event: "failedCreate",
        callback: EntityCreateListener,
    ): ForceEntity<this>;
}

export interface EntityEmitterOverloads
    extends EmitterOverloads<EntityEvents> {
    (
        event: "beforeDelete",
        props: EntityBeforeDeleteEvent<ForceEntity<this>>,
    ): boolean;
    (
        event: "delete",
        props: EntityDeleteEvent<ForceEntity<this>>,
    ): void;
    (
        event: "render",
        props: EntityRenderEvent<ForceEntity<this>>,
    ): void;
    (
        event: "update",
        props: EntityUpdateEvent<ForceEntity<this>>,
    ): void;
    (
        event: "create",
        props: EntityCreateEvent<ForceEntity<this>>,
    ): void;
    (
        event: "failedCreate",
        props: EntityFailedCreateEvent<ForceEntity<this>>,
    ): void;
}
