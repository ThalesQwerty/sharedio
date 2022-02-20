import { User } from "../../schema";
import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { SharedIORequest } from "../../connection";

interface ServerConnectionEvent {
    user: User;
}

interface ServerDisconnectionEvent {
    user: User;
}

interface ServerMessageEvent {
    user: User;
    message: SharedIORequest;
}

export interface ServerTickEvent {}

type ConnectionHandler = (event: ServerConnectionEvent) => void;
type DisconnectionHandler = (event: ServerDisconnectionEvent) => void;
type MessageHandler = (event: ServerMessageEvent) => void;
type TickHandler = () => void;

export interface ServerEvents {
    connection?: ConnectionHandler[];
    disconnection?: DisconnectionHandler[];
    message?: MessageHandler[];
    tick?: TickHandler[];
    nextTick?: TickHandler[];
}

export interface ServerListenerOverloads
    extends ListenerOverloads<ServerEvents> {
    /**
     * This function will be called whenever an user connects
     */
    (event: "connection", callback: ConnectionHandler): void;

    /**
     * This function will be called whenever an user disconnects
     */
    (event: "disconnection", callback: DisconnectionHandler): void;

    /**
     * This function will be called whenever a message is recieved from an user's websocket client
     */
    (event: "message", callback: MessageHandler): void;

    /**
     * This function will be called every server tick
     */
    (event: "tick", callback: TickHandler): void;

    /**
     * This function will be called in the next server tick
     */
    (event: "nextTick", callback: TickHandler): void;
}

export interface ServerEmitterOverloads
    extends EmitterOverloads<ServerEvents> {
    (event: "connection", props: ServerConnectionEvent): void;
    (event: "disconnection", props: ServerDisconnectionEvent): void;
    (event: "message", props: ServerMessageEvent): void;
    (event: "tick"): void;
    (event: "nextTick"): void;
}
