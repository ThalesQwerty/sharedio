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
} from "../../lib";

class Player extends Entity {
    @Public name = "Thales";
    @Public power = 9001;

    @Private secret = "Shh...";

    @Internal serverSide = 0;

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

    serverSideTest = 3;

    @Controlled kick() {
        // kicks the player (only the host can do that)
    }

    _Constructor() {
        // setInterval(() => {
        //     this.power = Math.floor(Math.random() * 10000);
        // }, 1000);
        // setTimeout(() => {
        //     this.server.deleteEntity(this);
        // }, 1000);

        // this.on("delete", () => {
        //     console.log("Aaaaaand it's gone! It's gone.");
        // })

        // this.on("tick", () => {
        //     console.log(this.server.ticks);
        // })

        return true;
    }
}

const server = new Server({
    port: 8080,
    debug: true,
    tickRate: 1
}).start();

server.on("connection", ({user}) => {
    const owned = new Player(
        server,
        { name: "You", power: 0 },
        user
    );

    // const notOwned = new Player(
    //     server,
    //     { name: "You", power: 0 }
    // );
});