import { Server } from "../../sharedio";
import { Channel } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { Entity } from "../../sharedio";
import { EntityAttribute, EntityAttributeName } from "../../sharedio";

export type EntityConfig<EntityType extends Entity = Entity> = ({
    server?: Server;
    channel: Channel;
}|{
    server: Server;
    channel?: Channel;
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

export type EntityConstructor<EntityType extends Entity> = new (config: EntityConfig<EntityType>) => EntityType;