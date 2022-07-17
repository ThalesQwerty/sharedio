import { id } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { Entity } from "../../sharedio";
import { EntityReservedAttributeName, EntityBuiltinRoleName } from "../../sharedio";

export interface SerializedEntity {
    id: string;
    type: string;
    owner: boolean,
    inside: boolean,
    roles: KeyValue<boolean>,
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
