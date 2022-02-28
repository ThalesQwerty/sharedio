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

class Player extends Entity {
    @Internal serverSide = 0;

    @Public name = "Thales";
    @Public power = 9001;

    @Writable superPublic = "wooow";

    @Private secret = "Shh...";

    @Readonly immutable = "Hello World!";

    @Private @Readonly immutableSecret = "Hello Person!";

    // @Public null = null;
    // @Public undefined = undefined;

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
}

class Test extends Entity {
    @Type isFirst() {
        return this.index <= 1;
    }

    @Public hello = "world";

    @If("isFirst")
    @Writable
    easterEgg = "We're no strangers to love";

    @Readonly index = 1;

    constructor(params: EntityConfig<Test>) {
        super(params);

        this.on("create", () => {
            this.index = this.server.entities.filter(
                (entity) => entity.type === this.type,
            ).length;
        });
    }
}

const server = new Server({
    port: 8080,
    debug: true,
    tickRate: 1,
    clientSchema: {
        path: "../client/src/sharedio",
        fileName: "newSchema2.ts",
        interfaceName: "Entities",
    },
}).start(() => {
    console.dir(Rules.from(Player), { depth: null });
});

server.on("connection", ({ user }) => {
    const test1 = new Test({ server });
    const test2 = new Test({ server });
});
