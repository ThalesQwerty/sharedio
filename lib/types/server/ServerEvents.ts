import { User } from "../../schema";
import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { SharedIORequest } from "../../connection";

interface ServerStartEvent {}
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

export type ServerStartListener = () => void;
type ServerConnectionListener = (event: ServerConnectionEvent) => void;
type ServerDisconnectionListener = (event: ServerDisconnectionEvent) => void;
type ServerMessageListener = (event: ServerMessageEvent) => void;
type ServerTickListener = () => void;

export interface ServerEvents {
    connection?: ServerConnectionListener[];
    disconnection?: ServerDisconnectionListener[];
    message?: ServerMessageListener[];
    tick?: ServerTickListener[];
    nextTick?: ServerTickListener[];
    start?: ServerStartListener[];
}

export interface ServerListenerOverloads
    extends ListenerOverloads<ServerEvents> {
    /**
     * This function will be called right after the server starts
     */
    (event: "start", callback: ServerStartListener): void;

    /**
     * This function will be called whenever an user connects
     */
    (event: "connection", callback: ServerConnectionListener): void;

    /**
     * This function will be called whenever an user disconnects
     */
    (event: "disconnection", callback: ServerDisconnectionListener): void;

    /**
     * This function will be called whenever a message is recieved from an user's websocket client
     */
    (event: "message", callback: ServerMessageListener): void;

    /**
     * This function will be called every server tick
     */
    (event: "tick", callback: ServerTickListener): void;

    /**
     * This function will be called in the next server tick
     */
    (event: "nextTick", callback: ServerTickListener): void;
}
export interface ServerEmitterOverloads
    extends EmitterOverloads<ServerEvents> {
    (event: "start"): void;
    (event: "connection", props: ServerConnectionEvent): void;
    (event: "disconnection", props: ServerDisconnectionEvent): void;
    (event: "message", props: ServerMessageEvent): void;
    (event: "tick"): void;
    (event: "nextTick"): void;
}
