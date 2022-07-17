import { EntityConstructor, IdList, User } from "../../sharedio";
import { Entity } from "./Entity";

export class EntityList<EntityType extends Entity = Entity> extends IdList<EntityType> {
    override filter(...args: Parameters<EntityType[]["filter"]>): EntityList<EntityType> {
        return new EntityList(...super.filter(...args));
    }

    /**
     * Filters entity by type
     */
    filterType<EntityType extends Entity[]>(...types: EntityConstructor<EntityType[number]>[]): EntityList<EntityType[number]> {
        return this.filter(entity => {
            for (const type of types) {
                if (entity instanceof type) return true
            }
            return false;
        }) as any;
    }

    /**
     * Filters entity by owner
     */
    filterOwner(...users: User[]): EntityList<EntityType> {
        return this.filter(entity => {
            for (const user of users) {
                if (entity.owner?.is(user)) return true;
            }
            return false;
        });
    }

    /**
     * Counts the entities from a given type
     */
    countType<EntityType extends Entity[]>(...types: EntityConstructor<EntityType[number]>[]): number {
        return this.filterType(...types).length;
    }

    /**
     * Counts the entities which belongs to a given user
     */
    countOwner(...users: User[]): number {
        return this.filterOwner(...users).length;
    }

    constructor(...items: Array<EntityType>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, EntityList.prototype);
    }
}