import SharedIO, { _internal, _private, _protected, _public, _readonly, User, Channel, Entity, EntityConfig, Server } from "../../lib";

const server = new SharedIO.Server();

class TestEntity extends SharedIO.Entity {
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

        this.on("create", () => {
            console.log("created");
        })
    }
}

class TestChannel extends SharedIO.Channel {
    constructor(config: EntityConfig) {
        super(config);

        this.on("join", ({ user }) => {
            console.log("new user joined!!!!");
        })
    }
}

const test = new TestEntity({ server }).then(() => {
    test.on("delete", () => console.log("deleted!", test.exists));
    test.delete();
    console.log(test.exists);
});