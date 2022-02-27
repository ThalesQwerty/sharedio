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
    EntityConfig
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

    @Type isFirst(user?: User) {
        return this.index <= 1;
    }

    @Public hello = "world";

    @If("isFirst")
    @Writable test = 2;

    @Readonly index = 1;

    constructor(params: EntityConfig<Test>) {
        super(params);

        this.on("create", () => {
            this.index = this.server.entities.filter(entity => entity.type === this.type).length;
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
        interfaceName: "Entities"
    }
}).start(() => {
    // console.log(Rules.from("Test"));
    console.dir(Rules.from(Test), { depth: null });
});

server.on("connection", ({user}) => {
    // const owned = new Player(
    //     server,
    //     { name: "You", power: 0 },
    //     user
    // );

    // const notOwned = new Player(
    //     server,
    //     { name: "You", power: 0 }
    // );

    const test1 = new Test({server});

    const test2 = new Test({server}).then(() => {
        // test2.index = 30;
        // console.log(test1, test2);

        console.log(user.subtypes(test1), user.subtypes(test2));
    })


});