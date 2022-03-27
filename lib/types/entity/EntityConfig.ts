import { Server } from "../../connection";
import { Entity, SharedChannel, User } from "../../schema";
import { KeyValue } from "../KeyValue";
import { EntityAttribute, EntityAttributeName } from "./EntityAttributes";

export type EntityConfig<EntityType extends Entity = Entity> = ({
    server?: Server;
    channel: SharedChannel;
}|{
    server: Server;
    channel?: SharedChannel;
})&{
    initialState?: Partial<
        KeyValue<EntityAttribute, EntityAttributeName<EntityType>>
    >;

    /**
     * Which user is creating this entity? If null, the entity will be created without an owner.
     */
    owner?: User | null;

    /**
     * Determines if this is a "real" entity or just a dummy for internal testing/mocking purposes.
     *
     * Do NOT set this attribute to true unless you're 100% absolutely sure of what you're doing.
     */
    dummy?: boolean;
}

export type EntityInterface<EntityType extends Entity = Entity> = {
    [key in keyof EntityType]: EntityType[key]
}