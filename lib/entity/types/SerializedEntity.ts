import { id } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { RawEntity } from "../../sharedio";
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

export type PrintableEntity<Type extends RawEntity = RawEntity> = KeyValue<
    unknown,
    Exclude<keyof Type, EntityReservedAttributeName>
> & {
    id: id<"RawEntity">;
    type: string;
    owner: id<"User">;
    server: id<"Server">;
};
