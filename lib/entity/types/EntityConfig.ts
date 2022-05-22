import { Server } from "../../sharedio";
import { Channel } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { RawEntity } from "../../sharedio";
import { EntityAttribute, EntityAttributeName } from "../../sharedio";

export type EntityConfig<EntityType extends RawEntity = RawEntity> = ({
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

export type EntityInterface<EntityType extends RawEntity = RawEntity> = {
    [key in keyof EntityType]: EntityType[key]
}