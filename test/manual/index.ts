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
    String, Number, Boolean
} from "../../lib";
import { EntityVariantBooleanExpression, EntityVariantName } from "../../lib/types";
class Player extends Entity {
    @Type ally() {
        return true;
    }

    @Type dead() {
        return this.health <= 0;
    }

    @Internal serverSide = 0;

    @String name = "Thales";
    @Number power = 9001;

    @Writable @String superPublic = "wooow";

    @Private @String secret = "Shh...";

    @Readonly @String immutable = "Hello World!";

    @Private @Readonly @String immutableSecret = "Hello Person!";

    @If("ally", "host")
    @Number health = 100;

    @Unless("ally", "owner")
    damage(hp: number) {
        this.health -= hp;
    }

    @If("!(ally & dead)")
    shoot() {
        console.log("PEW!");
    }

    @If("owner & !dead")
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
    console.dir(Rules.from(Player), { depth: null} );
});

server.on("connection", ({ user }) => {
    const test = new Player({ server });

    user.client.on("close", () => {
        test.delete();
    });
});