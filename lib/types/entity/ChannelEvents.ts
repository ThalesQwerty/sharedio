import { Channel, User } from "../../schema";
import { EntityEvents, EntityListenerOverloads, EntityEmitterOverloads } from "./EntityEvents";

export interface ChannelJoinEvent<ChannelType extends Channel = Channel> {
    user: User;
}

export interface ChannelCanJoinEvent<ChannelType extends Channel = Channel> {
    user: User;
}

export interface ChannelLeaveEvent<
    ChannelType extends Channel = Channel,
> {
    user: User;
}

export type ChannelCanJoinListener<ChannelType extends Channel = Channel> =
    (event: ChannelCanJoinEvent<ChannelType>) => void;
export type ChannelJoinListener<ChannelType extends Channel = Channel> =
    (event: ChannelJoinEvent<ChannelType>) => void;
export type ChannelLeaveListener<
    ChannelType extends Channel = Channel,
> = (event: ChannelLeaveEvent<ChannelType>) => void;

export interface ChannelEvents<ChannelType extends Channel = Channel> extends EntityEvents<ChannelType> {
    "canJoin?"?: ChannelCanJoinListener<ChannelType>[];
    join?: ChannelJoinListener<ChannelType>[];
    leave?: ChannelLeaveListener<ChannelType>[];
}

export interface ChannelListenerOverloads<ChannelType extends Channel = Channel> extends EntityListenerOverloads<ChannelType> {
        /**
    * Called before an user attempts to delete this entity.
    * The return value (true or false) will determine whether or not the user will be able to delete this entity.
    */
         (
            event: "join",
            callback: ChannelJoinListener<ChannelType>,
        ): ChannelType;
}

export interface ChannelEmitterOverloads<ChannelType extends Channel = Channel> extends EntityEmitterOverloads<ChannelType> {
    /**
* Called before an user attempts to delete this entity.
* The return value (true or false) will determine whether or not the user will be able to delete this entity.
*/
     (
        event: "join",
        callback: ChannelJoinEvent<ChannelType>,
    ): ChannelType;
}

