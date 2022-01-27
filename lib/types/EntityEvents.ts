import { ListenerOverloads, EmitterOverloads } from "../utils";
import { ServerTickEvent } from './ServerEvents';
import { Entity, User } from '../schema';

interface EntityCreateEvent {
    user: User,
    entity: Entity
}

interface EntityDeleteEvent {
    user: User,
    entity: Entity
}

interface EntityRenderEvent {}

interface EntityUpdateEvent {}

interface EntityBeforeDeleteEvent {
    user: User,
    entity: Entity
}

type CreateHandler = (event: EntityCreateEvent) => void;
type BeforeDeleteHandler = (
    event: EntityBeforeDeleteEvent,
) => boolean;
type DeleteHandler = (event: EntityDeleteEvent) => void;
type RenderHandler = (event: EntityRenderEvent) => void;
type UpdateHandler = (event: EntityUpdateEvent) => void;
type TickHandler = (event: ServerTickEvent) => void;

export interface EntityEvents {
    beforeDelete?: BeforeDeleteHandler[];
    delete?: DeleteHandler[];
    render?: RenderHandler[];
    update?: UpdateHandler[];
    tick?: TickHandler[];
    create?: CreateHandler[];
}

export interface EntityListenerOverloads
    extends ListenerOverloads<EntityEvents> {

    /**
     * Called before an user attempts to delete this entity.
     * The return value (true or false) will determine whether or not the user will be able to delete this entity.
     */
    (event: "beforeDelete", callback: BeforeDeleteHandler): void;

    /**
     * Called right after this entity gets deleted.
     * Useful for implementing cleanup code.
     */
    (event: "delete", callback: DeleteHandler): void;

    /**
     * This function will be called every server tick.
     */
    (event: "tick", callback: TickHandler): void;

    /**
     * Called before an user reads this entity's properties.
     */
    (event: "render", callback: RenderHandler): void;

    /**
     * Called before an user reads this entity's properties.
     */
    (event: "update", callback: UpdateHandler): void;

    /**
     * Called after the entity is successfully created.
     *
     * Note: this function will not be called if the entity _Constructor() method returns false, since this implies the entity won't be created.
     */
     (event: "create", callback: CreateHandler): void;
}

export interface EntityEmitterOverloads
    extends EmitterOverloads<EntityEvents> {
    (event: "beforeDelete", props: EntityBeforeDeleteEvent): boolean;
    (event: "delete", props: EntityDeleteEvent): void;
    (event: "render", props: EntityRenderEvent): void;
    (event: "update", props: EntityUpdateEvent): void;
    (event: "create", props: EntityCreateEvent): void;
}
