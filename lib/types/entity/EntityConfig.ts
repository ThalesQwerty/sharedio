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
    owner?: User | null;
}

export type EntityInterface<EntityType extends Entity = Entity> = {
    [key in keyof EntityType]: EntityType[key]
}