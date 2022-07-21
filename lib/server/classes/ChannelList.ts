import { ChannelConstructor, IdList, User } from "../../sharedio";
import { Channel } from "./Channel";

export class ChannelList<ChannelType extends Channel = Channel> extends IdList<ChannelType> {
    override filter(...args: Parameters<ChannelType[]["filter"]>): ChannelList<ChannelType> {
        return new ChannelList(...super.filter(...args));
    }

    /**
     * Filters entity by type
     */
    filterType<ChannelType extends Channel[]>(...types: ChannelConstructor<ChannelType[number]>[]): ChannelList<ChannelType[number]> {
        return this.filter(entity => {
            for (const type of types) {
                if (entity instanceof type) return true
            }
            return false;
        }) as any;
    }

    /**
     * Counts the entities from a given type
     */
    countType<ChannelType extends Channel[]>(...types: ChannelConstructor<ChannelType[number]>[]): number {
        return this.filterType(...types).length;
    }

    constructor(...items: Array<ChannelType>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, ChannelList.prototype);
    }
}