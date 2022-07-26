import { Channel, EntityConfig, Entity, Server, async, output, input, inputFor, User, shared, hidden } from "../../lib";
import { EntityList } from "../../lib/entity/classes/EntityList";
import { ChannelConfig } from "../../lib/server";
class TestChannel extends Channel {
    constructor(config: ChannelConfig) {
        super(config);
    }

    $sync() {
        if (this.$clock.ticks < 5) console.log("test");
    }
}

const server = new Server({
    port: 8080,
    debug: true,
});

class WatchTestEntity extends Entity {
    @output number = 0;
    @shared string = "wololo";
    @output boolean = false;

    @input unchangedNumber = 0;
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

    @shared method(whatever: any) {
        console.log("method!", whatever);
        return 5;
    }

    protected $init() {
        this.$delay(() => {
            this.number++;

            if (this.number > 20) this.$delete();
        }, 1000, true);

        return false;
    }
}

const testChannel = server.createChannel(TestChannel);

testChannel.$create<WatchTestEntity>(WatchTestEntity).then(() => {
    console.log("created entity");
}).catch(() => {
    console.log("entity not created");
})

server.start();

server.on("connection", ({ user }) => {
    console.log(server.users.length + " users on server");

    user.join(testChannel);
});