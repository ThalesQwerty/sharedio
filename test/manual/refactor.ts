import SharedIO, { hidden, input, inputFor, output, User } from "../../lib";

class TestEntity extends SharedIO.Entity {
    @input @output name = "Thales";
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

        const countUsers = () => {
            console.log(`${this.users.length} users in the channel`);
        }

        this.on("join", countUsers);
        this.on("leave", countUsers);
    }
}

const server = new SharedIO.Server({
    mainChannel: TestChannel,
    port: 8080,
    debug: true,
    clientSchema: {
        path: "../client/src/sharedio",
        fileName: "refactoredSchema.ts"
    }
});

// console.log(test.schema);
Error.stackTraceLimit = 100;

server.start(() => {
    console.dir(TestEntity.schema, { depth: null});
}).on("connection", () => {
    const test = new TestEntity({ server });
})


