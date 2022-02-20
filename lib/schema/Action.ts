import { User, Entity } from ".";
import { Rules } from ".";

/**
 * Class specialized in executing users' actions in the server
 */
export class Action {

    private _user: User;

    constructor(user: User) {
        this._user = user;
    }

    /**
     * Attempts to create a new entity
     */
    public create() {

    }

    /**
     * Attempts to delete an entity
     */
     public delete() {

    }

    /**
     * Attempts to write values into an entity's attributes
     */
    public write<EntityType extends Entity>(entity: EntityType, values: {[attribute in keyof EntityType]?: any}) {
        for (const attributeName in values) {
            entity[attributeName] = values[attributeName];
        }
    }
}