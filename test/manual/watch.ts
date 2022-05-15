import { Channel, EntityConfig, Server } from "../../lib";
import { Entity } from "../../lib/schema";
class TestChannel extends Channel {
    constructor(config: EntityConfig) {
        super(config);

        const countUsers = () => {
            console.log(`${this.users.length} users in the channel`);
        }

        this.on("join", countUsers);
        this.on("leave", countUsers);
    }
}

const server = new Server({
    mainChannel: TestChannel,
    port: 8080,
    debug: true
});
class WatchTestEntity extends Entity {
    number = 0;
    string = "";
    boolean = false;
    unchangedNumber = 0;
    unchangedString = "unchanged";
    unchangedBoolean = false;
    object = {
        a: 1,
        b: 2,
        constant: "constant",
        deep: {
            hello: "world"
        },
        pseudoNew: undefined
    };
    array = [0, 1, 2];
    pseudoNew = undefined;
    deletable: any = {
        deleteThis: 1,
        keepThis: 0
    };

    private _computed = 5;
    get computed() {
        return this._computed;
    }
    set computed(value: number) {
        this._computed = value / 2;
    }

    method(whatever: any) {
        console.log("method", whatever);
    }
}

const test = server.create(WatchTestEntity);

test.method(test.number);
test.string = "oxe";
console.log(test.computed);
test.computed = 50;
test.array.push(3);