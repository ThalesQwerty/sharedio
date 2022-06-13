import { IdList } from "../../helpers";
import { Client } from "./Client";

export class ClientList extends IdList<Client> {
    /**
     * Gets online clients
     */
    get online() {
        return this.filter(client => client.online);
    }

    /**
     * Gets offline clients
     */
    get offline() {
        return this.filter(client => !client.online);
    }

    override filter(...args: Parameters<Client[]["filter"]>): ClientList {
        return new ClientList(...super.filter(...args));
    }

    /**
     * Counts the clients which satisfies a given expression
     */
    count(...args: Parameters<Client[]["filter"]>): number {
        return this.filter(...args).length;
    }

    constructor(...items: Array<Client>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, ClientList.prototype);
    }
}