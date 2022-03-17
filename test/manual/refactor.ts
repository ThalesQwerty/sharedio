import { Entity, EntityConfig, Server, Cached } from "../../lib";
import { EntityAttributeName } from "../../lib/types";
import { ExtractDependencies, removeFlowControl } from "../../lib/utils";

const server = new Server();

/**
 * Manually informs SharedIO that this value is dependant on other values from this entity.
 */
function bind<DependencyArray extends string[] = string[]>(
    ...dependencies: DependencyArray
) {
    return function <EntityType extends Entity>(
        entity: EntityType,
        attributeName: DependencyArray extends EntityAttributeName<EntityType>[]
            ? EntityAttributeName<EntityType>
            : never,
    ) {
        process.nextTick(() => {
            const staticProps = entity.constructor as typeof Entity;
            console.log(staticProps.schema);
        })
    };
}

function out <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>
) {

};

class TestEntity extends Entity {
    name = "Thales";
    power = 9001;

    _blah = 3;

    _test = 5;
    set test(value: number) {
        this._test = value;
    }
    get test() {
        return this._test;
    }

    method(a: number) {
        return this._test;
    }

    constructor(config: EntityConfig) {
        super(config);
    }
}

const test = new TestEntity({ server }).then(() => {
    setImmediate(() => test._test = 10);
}).on("change", ({ changes }) => console.log("mudou", changes));

const d = Object.getOwnPropertyDescriptors(test);
const s = Object.getOwnPropertyDescriptors(test.constructor.prototype);

// console.log("GOTCHA!", ExtractDependencies(TestEntity, "test"));
console.dir(TestEntity.schema, { depth: null });

// console.log(Object.getOwnPropertyDescriptor(TestEntity.prototype, "test")?.get?.toString());
