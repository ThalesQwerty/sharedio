import { KeyValue, SerializedEntity } from "../../sharedio";

export type ViewInterface = KeyValue<SerializedEntity, string>;

export type ViewChanges = KeyValue<Partial<SerializedEntity>, string>;
export type ViewDeletions = string[];