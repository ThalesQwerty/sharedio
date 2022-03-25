import SharedIO, { hidden, input, inputFor, output, User } from "../../lib";

class TestEntity extends SharedIO.Entity {
    @output name = "Thales";
    @output power = 9001;

    @input right = false;

    @hidden _blah = 3;
    @hidden _test = 5;

    @output
    get constant() {
        return "test";
    }

    @output @input
    set idk(value: number) {

    }

    @output
    set test(value: number) {
        this._test = value;
    }
    get test() {
        return this._test;
    }

    @input
    method(a: number) {
        return this._test;
    }

    constructor(config: SharedIO.EntityConfig) {
        super(config);

        this.on("create", ({ user }) => {
            console.log("created");
        })
    }
}

class TestChannel extends SharedIO.Channel {
    constructor(config: SharedIO.EntityConfig) {
        super(config);

        this.on("join", ({ user }) => {
            console.log("new user joined!!!!");
        })
    }
}

const server = new SharedIO.Server({
    mainChannel: TestChannel
});

const test = new TestEntity({ server }).then(() => {
    test.delete();
    console.log(test.exists);
});

console.log(test.schema);


