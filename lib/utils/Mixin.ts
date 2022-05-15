import { KeyValue } from "../types";

type Constructor = new (...args: any[]) => object;

export function Mixin<BaseClass extends Constructor>(Base: BaseClass, traits: Constructor[]): BaseClass {
    let newConstructor = Base;

    traits.forEach((Trait) => {
        Object.getOwnPropertyNames(Trait.prototype).forEach((name) => {
            Object.defineProperty(
                Base.prototype,
                name,
                Object.getOwnPropertyDescriptor(Trait.prototype, name) ||
                Object.create(null)
            );
        });
    });

    newConstructor = class extends Base {
        constructor (...args: any[]) {
            super(...args);

            traits.forEach((Trait) => {
                const dummy = new Trait();

                Object.getOwnPropertyNames(dummy).forEach((name) => {
                    Object.defineProperty(
                        this,
                        name,
                        Object.getOwnPropertyDescriptor(dummy, name) ||
                        Object.create(null)
                    );
                });
            });
        }
    }

    return newConstructor;
}