import { KeyValue } from "../../sharedio";
import { Entity } from "../../sharedio";

interface EntityCache {
    [name: string]: CachedAttribute;
}

interface CachedAttribute {
    /**
     * The value being held by the cache
     */
    value: any;
    /**
     * The cache expiration timestamp (in milliseconds)
     */
    expiration: number;
}

/**
 * Class for managing caching of computed attributes on entities
 */
export class Cache {
    public static entities: KeyValue<EntityCache> = {};

    /**
     * Creates a cache entry  (or updates it, if it already exists)
     * @param entity
     * @param attributeName
     * @param value The current value of the attribute
     * @param duration For how long (in milliseconds) will this cache be used?
     */
    public static add(
        entity: Entity,
        attributeName: string,
        value: any,
        duration: number,
    ) {
        if (duration > 0) {
            const currentTimestamp = new Date().getTime();
            const newCache = this.entities[entity.id] ?? {};

            newCache[attributeName] = {
                value,
                expiration: currentTimestamp + duration,
            };

            this.entities[entity.id] = newCache;
        }
    }

    /**
     * Manually removes a cache entry
     * @param entity
     * @param attributeName
     */
    public static remove(entity: Entity, attributeName: string) {
        const entityCache = this.entities[entity.id];
        if (entityCache) delete entityCache[attributeName];
    }

    /**
     * Automatically removes expired cache entries
     */
    public static update() {
        const currentTimestamp = new Date().getTime();

        for (const entityId in this.entities) {
            const currentEntityCache = this.entities[entityId];

            if (currentEntityCache)
                for (const attributeName in currentEntityCache) {
                    const currentCache =
                        currentEntityCache[attributeName];

                    if (currentCache.expiration <= currentTimestamp)
                        delete currentEntityCache[attributeName];
                }
        }
    }

    /**
     * Lists the values read from an entity's cache
     * @param entity
     */
    public static get(entity: Entity) {
        const currentTimestamp = new Date().getTime();
        const values: KeyValue<any, string> = {};

        for (const entityId in this.entities) {
            const currentEntityCache = this.entities[entityId];

            if (currentEntityCache)
                for (const attributeName in currentEntityCache) {
                    const currentCache =
                        currentEntityCache[attributeName];

                    if (currentCache.expiration <= currentTimestamp)
                        delete currentEntityCache[attributeName];
                    else {
                        values[attributeName] = currentCache.value;
                    }
                }
        }

        return values;
    }
}
