import { HasId } from "./HasId";
import { List } from "./List";

export class IdList<T extends HasId> extends List<T> {
    /**
     * Adds a element to the list, if it's not already included
     * @param element The element to be included into the list
     */
    override add(element: T) {
        if (!this.has(element)) this.push(element);
    }

    /**
     * Removes an element from the list.
     * @param element
     * @returns `true` if element was included; `false` otherwise.
     */
    override remove(element: T) {
        for (let i = 0; i < this.length; i++) {
            const currentElement = this[i];
            if (currentElement.is(element)) {
                this.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    /**
     * Verifies if this list contains a given element
     * @param element
     */
    has(element: T) {
        for (let i = 0; i < this.length; i++) {
            const currentElement = this[i];
            if (currentElement.is(element)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lists the elements IDs
     */
    get ids() {
        return this.map(element => element.id) as string[];
    }

     /**
     * Attempts to find an element by its ID
     * @param id
     * @returns The element, if it's been found; `undefined` otherwise.
     */
    findById(id: string) {
        return this.find(element => element.id === id);
    }
}