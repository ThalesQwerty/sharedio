import { Input, AuthInput, PongInput, Client } from "../../connection";
import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { WriteInput, CallInput } from "../../connection/Input";

interface ClientAuthEvent {
    input: AuthInput;
}

interface ClientMessageEvent {
    input: Input;
}

interface ClientPongEvent {
    input: PongInput;
}

interface ClientWriteEvent {
    input: WriteInput;
}

interface ClientCallEvent {
    input: CallInput;
}

interface ClientCloseEvent {}

type ClientAuthListener = (event: ClientAuthEvent) => void;
type ClientMessageListener = (event: ClientMessageEvent) => void;
type ClientPongListener = (event: ClientPongEvent) => void;
type ClientWriteListener = (event: ClientWriteEvent) => void;
type ClientCallListener = (event: ClientCallEvent) => void;
type ClientCloseListener = () => void;

export interface ClientEvents {
    auth?: ClientAuthListener[];
    message?: ClientMessageListener[];
    pong?: ClientPongListener[];
    write?: ClientWriteListener[];
    call?: ClientCallListener[];
    close?: ClientCloseListener[];
}

export interface ClientListenerOverloads
    extends ListenerOverloads<ClientEvents> {
    /**
     * This function will be called when a new user authenticates
     */
    (event: "auth", callback: ClientAuthListener): Client;

    /**
     * This function will be called when a message arrives
     */
    (event: "message", callback: ClientMessageListener): Client;

    /**
     * This function will be called when a user responds a "ping" with a "pong"
     */
    (event: "pong", callback: ClientPongListener): Client;

    /**
     * This function will be called when a user attempts to edit an entity's attributes
     */
    (event: "write", callback: ClientWriteListener): Client;

    /**
     * This function will be called when a user attempts to call an entity's method
     */
    (event: "call", callback: ClientCallListener): Client;

    /**
     * This function will be called when an user disconnects
     */
    (event: "close", callback: ClientCloseListener): Client;
}

export interface ClientEmitterOverloads
    extends EmitterOverloads<ClientEvents> {
    (event: "auth", props: ClientAuthEvent): Client;
    (event: "message", props: ClientMessageEvent): Client;
    (event: "pong", props: ClientPongEvent): Client;
    (event: "write", props: ClientWriteEvent): Client;
    (event: "call", props: ClientCallEvent): Client;
    (event: "close"): Client;
}
