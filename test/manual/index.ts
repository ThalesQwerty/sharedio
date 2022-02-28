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
class Test extends Entity {
    @Type first() {
        return this.index === 1;
    }

    @Public hello = "world";

    @If("first")
    @Writable
    easterEgg = "We're no strangers to love";

    @Readonly index = 1;

    @Readonly unstable:null|undefined = null;

    constructor(params: EntityConfig<Test>) {
        super(params);

        // this.on("create", () => {
        //     this.index = this.server.entities.filter(
        //         (entity) => entity.type === this.type,
        //     ).length;
        // });

        const interval = setInterval(() => {
            this.unstable = this.unstable === null ? undefined : null;
        }, 1000);

        this.on("delete", () => {
            clearInterval(interval);
        });
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

server.on("connection", ({ user }) => {
    const test = new Test({ server });

    user.client.on("close", () => {
        test.delete();
    });
});