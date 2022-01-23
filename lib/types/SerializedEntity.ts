import { KeyValue } from ".";

export interface SerializedEntity {
    owned: boolean;
    id: string;
    state: KeyValue;
    actions: string[];
}
