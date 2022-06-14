export class List<T> extends Array<T> {
    /**
     * Gets the first element in the list
     */
    get first() {
        return this[0];
    }

    /**
     * Gets the last element in the list
     */
    get last() {
        return this[this.length - 1];
    }

    override filter(...args: Parameters<T[]["filter"]>): List<T> {
        return new List(...super.filter(...args));
    }

    /**
     * Is this list empty?
     */
    get empty() {
        return !this.length;
    }

    /**
     * Counts the elements which satisfies a given expression
     */
    count(...args: Parameters<T[]["filter"]>): number {
        return this.filter(...args).length;
    }

    /**
     * Adds a element to the list, if it's not already included
     * @param element The element to be included into the list
     */
    add(element: T) {
        if (!this.includes(element)) this.push(element);
    }

    /**
     * Removes an element from the list.
     * @param element
     * @returns `true` if element was included; `false` otherwise.
     */
    remove(element: T) {
        for (let i = 0; i < this.length; i++) {
            const currentElement = this[i];
            if (currentElement === element) {
                this.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    /**
     * Removes all elements from the list
     */
    clear() {
        this.splice(0, this.length);
    }

    /**
     * Removes all elements from the list and replace them with new ones
     * @param elements The new elements to be added
     */
    overwrite(...elements: T[]) {
        this.splice(0, this.length, ...elements);
    }

    constructor(...items: Array<T>) {
        if (items) super(...items);
        else super();
        Object.setPrototypeOf(this, List.prototype);
    }
}