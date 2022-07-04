import { Channel, EntityConfig, Entity, Server, async, output, input, inputFor } from "../../lib";
import { EntityList } from "../../lib/entity/classes/EntityList";
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
    debug: true,
});

class WatchTestEntity extends Entity {
    @output number = 0;
    @output @inputFor("all") string = "wololo";
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

    $init() {
        // setInterval(() => {
        //     if (this.exists) {
        //         console.log("string value:", this.string);
        //     }
        // }, 5000);
    }

    @inputFor("all") method(whatever: any) {
        console.log("method!", whatever);
        return 5;
    }
}

const testEntity = server.mainChannel.create(WatchTestEntity) as WatchTestEntity;
testEntity.number = -1;

server.start(() => {
    // setInterval(() => {
    //     const firstUser = server.users[0];

    //     if (firstUser) {
    //         console.log(firstUser.clients.length, "clients connected");
    //     }
    // }, 5000);
});

server.on("connection", () => {
    console.log(server.users.length + " users on server");
})
