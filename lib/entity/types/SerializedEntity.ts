import { id } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { RawEntity } from "../../sharedio";
import { EntityReservedAttributeName } from "../../sharedio";

export interface SerializedEntity {
    id: string;
    type: string;
    owned: boolean;
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
