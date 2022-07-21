import { Entity } from "../../entity";
import { Channel, KeyValue, User } from "../../sharedio";
import { Client } from "../../sharedio";
import { ClientEvents } from "../../sharedio";

/**
 * Base interface for inputs
 */
interface SharedIOBaseInput {
    type: keyof ClientEvents;
    id: string;
    channel: Channel | string | null;
    data: KeyValue;
}

/**
 * Attempts to associate a client with an existing user, or a new user if the attempt fails
 */
export interface AuthInput extends SharedIOBaseInput {
    type: "auth";
    channel: null;
    data: {
        token: string | null;
    }
}

/**
 * Responds as soon as possible to a ping sent by the server
 */
export interface PongInput extends SharedIOBaseInput {
    type: "pong";
    channel: null;
    data: {
        packetId: string;
    }
}

/**
 * Attempts to write values into an entity's properties
 */
export interface WriteInput extends SharedIOBaseInput {
    type: "write";
    channel: string;
    data: {
        entity: string;
        properties: KeyValue;
    }
}

/**
 * Attemps to call an entity's method
 */
export interface CallInput extends SharedIOBaseInput {
    type: "call";
    channel: string;
    data: {
        entity: string;
        methodName: string;
        parameters: unknown[];
    }
}

/**
 * Adds extra information to the input sent by the client so it can be properly handled by the server
 */
export type Routed<InputType extends ChannelInput> = InputType & {
    /**
     * Extra information that has been added by the router to the original input
     */
    routed: {
        /**
         * The client that sent the input
         */

        client: Client,
        /**
         * The user who sent the input
         */

        user: User,
        /**
         * The channel where the input has been sent
         */

        channel: Channel,
        /**
         * The entity the user is attempting to use
         */
        entity: Entity
    }
}

export type Input =
    | AuthInput
    | PongInput
    | WriteInput
    | CallInput;

export type ChannelInput =
    | WriteInput
    | CallInput;

export type ServerInput =
    | AuthInput
    | PongInput;
