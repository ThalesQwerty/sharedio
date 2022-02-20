import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { ServerTickEvent } from '../server/ServerEvents';
import { Entity, User } from '../../schema';

interface EntityCreateEvent<EntityType extends Entity = Entity> {
    user: User,
    entity: EntityType
}

interface EntityDeleteEvent<EntityType extends Entity = Entity> {
    user: User,
    entity: EntityType
}

interface EntityRenderEvent<EntityType extends Entity = Entity> {}

interface EntityUpdateEvent<EntityType extends Entity = Entity> {}

interface EntityBeforeDeleteEvent<EntityType extends Entity = Entity> {
    user: User,
    entity: EntityType
}

type CreateHandler<EntityType extends Entity = Entity> = (event: EntityCreateEvent<EntityType>) => void;
type BeforeDeleteHandler<EntityType extends Entity = Entity> = (
    event: EntityBeforeDeleteEvent<EntityType>,
) => boolean;
type DeleteHandler<EntityType extends Entity = Entity> = (event: EntityDeleteEvent<EntityType>) => void;
type RenderHandler<EntityType extends Entity = Entity> = (event: EntityRenderEvent<EntityType>) => void;
type UpdateHandler<EntityType extends Entity = Entity> = (event: EntityUpdateEvent<EntityType>) => void;
type TickHandler = (event: ServerTickEvent) => void;

export interface EntityEvents {
    beforeDelete?: BeforeDeleteHandler[];
    delete?: DeleteHandler[];
    render?: RenderHandler[];
    update?: UpdateHandler[];
    tick?: TickHandler[];
    create?: CreateHandler[];
}

type RemoveInterfaces<T> = Exclude<T, EntityListenerOverloads|EntityEmitterOverloads>;
type ForceEntity<T> = RemoveInterfaces<T> extends Entity ? RemoveInterfaces<T> : Entity;

export interface EntityListenerOverloads
    extends ListenerOverloads<EntityEvents> {

    /**
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    (event: "beforeDelete", callback: BeforeDeleteHandler): ForceEntity<this>;

    /**
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    (event: "delete", callback: DeleteHandler): ForceEntity<this>;

    /**
     * This function will be called every server tick.
     */
    (event: "tick", callback: TickHandler): ForceEntity<this>;

    /**
     * Called before an user reads this entity's properties.
     */
    (event: "render", callback: RenderHandler): ForceEntity<this>;

    /**
     * Called before an user reads this entity's properties.
     */
    (event: "update", callback: UpdateHandler): ForceEntity<this>;

    /**
     * Called after the entity is successfully created.
     *
     * Note: this function will not be called if the entity's _Constructor() method returns false, since this implies the entity won't be created.
     */
     (event: "create", callback: CreateHandler): ForceEntity<this>;
}

export interface EntityEmitterOverloads
    extends EmitterOverloads<EntityEvents> {
    (event: "beforeDelete", props: EntityBeforeDeleteEvent<ForceEntity<this>>): boolean;
    (event: "delete", props: EntityDeleteEvent<ForceEntity<this>>): void;
    (event: "render", props: EntityRenderEvent<ForceEntity<this>>): void;
    (event: "update", props: EntityUpdateEvent<ForceEntity<this>>): void;
    (event: "create", props: EntityCreateEvent<ForceEntity<this>>): void;
}
