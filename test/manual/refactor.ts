import { Entity, EntityConfig, Server, Cached, _internal, _private, _protected, _public, _readonly } from "../../lib";

const server = new Server();
class TestEntity extends Entity {
    @_readonly name = "Thales";
    @_readonly power = 9001;

    @_private right = false;

    @_internal _blah = 3;

    _test = 5;

    @_public
    get constant() {
        return "test";
    }

    @_public
    set idk(value: number) {

    }

    @_public
    set test(value: number) {
        this._test = value;
    }
    get test() {
        return this._test;
    }

    @_public
    method(a: number) {
        return this._test;
    }

    constructor(config: EntityConfig) {
        super(config);

        this.on("tick", () => {
            if (this.right) {
                this.power += this.server.deltaTime * 10;
            }
        })
    }
}

const test = new TestEntity({ server });

console.dir(test.schema, { depth: null });