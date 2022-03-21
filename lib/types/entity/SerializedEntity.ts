import { KeyValue } from "..";
import { id } from "../../utils";
import { Entity } from "../../schema";
import { EntityReservedAttributeName } from "./EntityAttributes";

export interface SerializedEntity {
    id: string;
    type: string;
    owned: boolean;
    state: KeyValue;
    actions: string[];
}

export type PrintableEntity<Type extends Entity = Entity> = KeyValue<
    unknown,
    Exclude<keyof Type, EntityReservedAttributeName>
> & {
    id: id<"Entity">;
    type: string;
    owner: id<"User">;
    server: id<"Server">;
};
