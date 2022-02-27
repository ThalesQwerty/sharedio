import { KeyValue, SerializedEntity } from "../types";
import { KeyValueDifference } from "../utils";

export interface SharedIOBaseResponse {
    action: "auth" | "ping" | "view";
}

export interface AuthResponse extends SharedIOBaseResponse {
    action: "auth";
    userId: string;
    token: string;
}

export interface PingResponse extends SharedIOBaseResponse {
    action: "ping";
    packetId: string;
    roundTripTime: number;
    packetLossRatio: number;
}

export interface ViewResponse
    extends KeyValueDifference<KeyValue<SerializedEntity>>,
        SharedIOBaseResponse {
    action: "view";
}

export type SharedIOResponse =
    | AuthResponse
    | PingResponse
    | ViewResponse;
