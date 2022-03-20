import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { Channel, Entity, User } from "../../schema";
import { EntityState } from "..";

interface EntityCreateEvent<EntityType extends Entity = Entity> {
    user: User|null;
    entity: EntityType;
}

interface EntityFailedCreateEvent<
    EntityType extends Entity = Entity,
> {
    user: User|null;
    entity: EntityType;
}

interface EntityDeleteEvent<EntityType extends Entity = Entity> {
    user: User|null;
    entity: EntityType;
}

interface EntityRenderEvent<EntityType extends Entity = Entity> {}



interface EntityChangeEvent<EntityType extends Entity = Entity> {
    entity: EntityType;
    changes: EntityState<EntityType>["changes"]
}

interface EntityCanDeleteEvent<
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
type EntityCanDeleteListener<EntityType extends Entity = Entity> =
    (event: EntityCanDeleteEvent<EntityType>) => boolean;
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

type Trap<T extends (...args: any[]) => any> = (...args: Parameters<T>) => boolean;

export interface EntityEvents<EntityType extends Entity = Entity> {
    "canDelete?"?: EntityCanDeleteListener<EntityType>[];
    delete?: EntityDeleteListener<EntityType>[];
    render?: EntityRenderListener<EntityType>[];
    change?: EntityChangeListener<EntityType>[];
    tick?: EntityTickListener[];
    create?: EntityCreateListener<EntityType>[];
    failedCreate?: EntityFailedCreateListener<EntityType>[];
}

// export interface ChannelEvents<ChannelType extends Channel = Channel> {
//     join?: EntityFailedCreateListener<ChannelType>[];
// }
export interface EntityTraps<EntityType extends Entity = Entity> {
    delete?: Trap<EntityDeleteListener<EntityType>>[];
    create?: Trap<EntityCreateListener<EntityType>>[];
}
// export interface ChannelListenerOverlaods<ChannelType extends Channel = Channel> {
//         /**
//     * Called before an user attempts to delete this entity.
//     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
//     */
//          (
//             event: "join",
//             callback: EntityFailedCreateListener<ChannelType>,
//         ): ChannelType;
// }
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
