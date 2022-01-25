import { ListenerOverloads, EmitterOverloads } from "../utils";
import { ServerTickEvent } from './ServerEvents';

interface EntityCreateEvent {}

interface EntityDeleteEvent {}

interface EntityRenderEvent {}

interface EntityUpdateEvent {}

interface EntityBeforeDeleteEvent {}

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
}

export interface EntityEmitterOverloads
    extends EmitterOverloads<EntityEvents> {
    (event: "beforeDelete", props: EntityBeforeDeleteEvent): void;
    (event: "delete", props: EntityDeleteEvent): void;
    (event: "render", props: EntityRenderEvent): void;
    (event: "update", props: EntityUpdateEvent): void;
}
