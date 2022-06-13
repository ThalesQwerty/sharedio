import { EntityConstructor, User } from "../../sharedio";
import { RawEntity } from "./Entity";

export class EntityList<EntityType extends RawEntity = RawEntity> extends Array<EntityType> {
    /**
     * Gets the first entity in the list
     */
    get first() {
        return this[0];
    }

    /**
     * Gets the last entity in the list
     */
    get last() {
        return this[this.length - 1];
    }

    filter(...args: Parameters<EntityType[]["filter"]>): EntityList<EntityType> {
        return super.filter(...args) as EntityList<EntityType>;
    }

    /**
     * Filters entity by type
     */
    filterType<EntityType extends RawEntity[]>(...types: EntityConstructor<EntityType[number]>[]): EntityList<EntityType[number]> {
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
     * Counts the entities which satisfies a given expression
     */
    count(...args: Parameters<EntityType[]["filter"]>): number {
        return this.filter(...args).length;
    }

    /**
     * Counts the entities from a given type
     */
    countType<EntityType extends RawEntity[]>(...types: EntityConstructor<EntityType[number]>[]): number {
        return this.filterType(...types).length;
    }

    /**
     * Counts the entities which belongs to a given user
     */
    countOwner(...users: User[]): number {
        return this.filterOwner(...users).length;
    }


    /**
     * Removes an entity from the list.
     * @param entity
     * @returns `true` if entity was included; `false` otherwise.
     */
    remove(entity: EntityType) {
        for (let i = 0; i < this.length; i++) {
            const currentEntity = this[i];
            if (currentEntity.is(entity)) {
                this.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    /**
     * Verifies if this list contains a given entity
     * @param entity
     */
    has(entity: EntityType) {
        for (let i = 0; i < this.length; i++) {
            const currentEntity = this[i];
            if (currentEntity.is(entity)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lists the entity IDs
     */
    get ids() {
        return this.map(entity => entity.id) as string[];
    }

     /**
     * Attempts to find an entity by its ID
     * @param id
     * @returns The entity, if it's been found; `undefined` otherwise.
     */
    findById(id: string) {
        return this.find(entity => entity.id === id);
    }

    constructor(...items: Array<EntityType>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, EntityList.prototype);
    }
}