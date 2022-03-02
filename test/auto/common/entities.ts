import { Entity, Public, Private, Protected, Internal, Readonly, EntityConfig } from "../../..";

export class AccessPoliciesTestEntity extends Entity {
    @Public publicAttr = "public";
    @Private privateAttr = "private";
    @Protected protectedAttr = "protected";
    @Internal internalAttr = "internal";
    @Readonly readonlyAttr = "readonly";

    @Private @Readonly privateReadonlyAttr = "private readonly";
    @Private @Protected privateProtectedAttr = "private protected";
    @Protected @Readonly protectedReadonlyAttr = "protected readonly";
    @Private @Protected @Readonly privateProtectedReadonlyAttr =
        "private protected readonly";
}

export class UncreatableEntity extends Entity {
    constructor(config: EntityConfig) {
        super(config);
        this.delete();
    }
}

export class CreatableEntity extends Entity {
    hasBeenDeleted: boolean = false;
    hasBeenCreated: boolean = false;
    tickCounter: number = 0;

    constructor(config: EntityConfig) {
        super(config);
        this.on("delete", () => {
            this.hasBeenDeleted = true;
        });
        this.on("tick", () => {
            this.tickCounter++;
        });
    }
}

