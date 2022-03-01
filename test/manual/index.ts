import {
    Server,
    Entity,
    Public,
    Private,
    Readonly,
    Internal,
    Controlled,
    Writable,
    Get,
    Set,
    Cached,
    User,
    Rules,
    Type,
    UsePolicy,
    If,
    Unless,
    EntityConfig,
} from "../../lib";
import { EntityIntersectionVariantName, EntityVariantName } from "../../lib/types";
class Player extends Entity {
    @Type ally() {
        return true;
    }

    @Internal serverSide = 0;

    @Public name = "Thales";
    @Public power = 9001;

    @Writable superPublic = "wooow";

    @Private secret = "Shh...";

    @Readonly immutable = "Hello World!";

    @Private @Readonly immutableSecret = "Hello Person!";

    @If("ally")
    health = 100;

    // @Public null = null;

    @Public
    shoot() {
        console.log("PEW!");
    }

    @Private
    shootPrivately() {
        console.log("PEW! (privately)");
    }

    @Get myUserId(user?: User) {
        return user?.id;
    }

    @Public randomNumber = 0;

    @Controlled kick() {
        // kicks the player (only the host can do that)
    }

    constructor(config: EntityConfig) {
        super(config);

        const interval = setInterval(() => {
            // this.randomNumber = Math.floor(Math.random() * 10000);
        }, 1000);

        this.on("delete", () => {
            clearInterval(interval);
        })
    }
}

const server = new Server({
    port: 8080,
    debug: true,
    tickRate: 1,
    clientSchema: {
        path: "../client/src/sharedio",
        fileName: "schema.ts",
        interfaceName: "Entities",
    },
}).start();

setImmediate(() => {
    console.dir(Rules.schema, { depth: null});
});

server.on("connection", ({ user }) => {
    const test = new Player({ server });

    user.client.on("close", () => {
        test.delete();
    });
});