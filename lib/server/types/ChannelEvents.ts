import { EntityEvents, EntityListenerOverloads, RawEntity, Entity, EntityCreateListener, EntityDeleteListener, EntityEmitterOverloads, EntityCreateEvent, EntityDeleteEvent } from "../../sharedio";
import { User } from "../../sharedio";
import { RawChannel, Channel } from "../../sharedio";

export interface ChannelJoinEvent<ChannelType extends RawChannel = RawChannel> {
    user: User;
}

export interface ChannelCanJoinEvent<ChannelType extends RawChannel = RawChannel> {
    user: User;
}

export interface ChannelLeaveEvent<
    ChannelType extends RawChannel = RawChannel,
    > {
    user: User;
}

export type ChannelCanJoinListener<ChannelType extends RawChannel = RawChannel> =
    (event: ChannelCanJoinEvent<ChannelType>) => boolean;
export type ChannelJoinListener<ChannelType extends RawChannel = RawChannel> =
    (event: ChannelJoinEvent<ChannelType>) => void;
export type ChannelLeaveListener<
    ChannelType extends RawChannel = RawChannel,
    > = (event: ChannelLeaveEvent<ChannelType>) => void;

export interface ChannelEvents<ChannelType extends RawChannel = RawChannel> extends EntityEvents<ChannelType> {
    "canJoin?"?: ChannelCanJoinListener<ChannelType>[];
    join?: ChannelJoinListener<ChannelType>[];
    leave?: ChannelLeaveListener<ChannelType>[];
}

export interface ChannelListenerOverloads<ChannelType extends RawChannel = RawChannel> extends EntityListenerOverloads<ChannelType> {
    /**
    * Called right after a new user joins this channel.
    */
    (
        event: "join",
        callback: ChannelJoinListener<ChannelType>,
    ): ChannelType;

    /**
    * Called right after an user leaves this channel.
    */
    (
        event: "leave",
        callback: ChannelLeaveListener<ChannelType>,
    ): ChannelType;

    /**
     * Called before an user attempts to join this channel.
     * The return value (true or false) will determine whether or not the user will be able to join this channel.
     */
    (
        event: "canJoin?",
        callback: ChannelCanJoinListener<ChannelType>,
    ): ChannelType;

    /**
    * Called right after an user joins a subchannel inside this channel.
    */
    <SubChannel extends RawChannel = Channel>(
        event: "joinInside",
        callback: ChannelJoinListener<SubChannel>,
    ): ChannelType;

    /**
    * Called right after an user creates a new entity inside this channel.
    */
    <SubEntity extends RawEntity = Entity>(
        event: "createInside",
        callback: EntityCreateListener<SubEntity>,
    ): ChannelType;

    /**
    * Called right after an user deletes an entity inside this channel.
    */
     <SubEntity extends RawEntity = Entity>(
        event: "deleteInside",
        callback: EntityDeleteListener<SubEntity>,
    ): ChannelType;
}

export interface ChannelEmitterOverloads<ChannelType extends RawChannel = RawChannel> extends EntityEmitterOverloads<ChannelType> {
    (
        event: "canJoin?",
        callback: ChannelCanJoinEvent<ChannelType>,
    ): boolean;
    (
        event: "join",
        callback: ChannelJoinEvent<ChannelType>,
    ): true;
    (
        event: "leave",
        callback: ChannelLeaveEvent<ChannelType>,
    ): true;
    <SubChannel extends RawChannel = Channel>(
        event: "joinInside",
        callback: ChannelJoinEvent<SubChannel>,
    ): true;
    <SubEntity extends RawEntity = Entity>(
        event: "createInside",
        callback: EntityCreateEvent<SubEntity>,
    ): true;
    <SubEntity extends RawEntity = Entity>(
        event: "deleteInside",
        callback: EntityDeleteEvent<SubEntity>,
    ): true;
}

