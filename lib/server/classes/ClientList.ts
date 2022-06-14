import { IdList } from "../../helpers";
import { Client } from "./Client";

export class ClientList extends IdList<Client> {
    override filter(...args: Parameters<Client[]["filter"]>): ClientList {
        return new ClientList(...super.filter(...args));
    }

    constructor(...items: Array<Client>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, ClientList.prototype);
    }
}