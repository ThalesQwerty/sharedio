import { KeyValue } from "../types";

type Constructor = new (...args: any[]) => object;

export function Mixin<BaseClass extends Constructor>(base: BaseClass, traits: Constructor[]): BaseClass {
    let newConstructor = base;

    traits.forEach((trait) => {
        Object.getOwnPropertyNames(trait.prototype).forEach((name) => {
            Object.defineProperty(
                base.prototype,
                name,
                Object.getOwnPropertyDescriptor(trait.prototype, name) ||
                Object.create(null)
            );
        });
    });

    newConstructor = class extends base {
        constructor (...args: any[]) {
            super(...args);

            traits.forEach((trait) => {
                const dummy = new trait();

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

    console.log(base.name, newConstructor);

    return newConstructor;
}

// export class _Mixin {
//     private static readonly done: KeyValue<Constructor[], string> = {};

//     public static apply<T extends Constructor>(base: T, traits: Constructor[]) {
//         let newConstructor = base;

//         if (!this.done[base.name]) {
//             this.done[base.name] = [];

//             newConstructor = class extends base {
//                 constructor (...args: any[]) {
//                     super(...args);

//                     console.log(`new ${base.name} created`);
//                     MixinToInstance(this, traits);
//                     console.log(this);
//                 }
//             }

//             console.log(base.name, newConstructor);
//         }

//         const registry = this.done[base.name];

//         traits.forEach((trait) => {
//             if (!registry.find(constructor => constructor.name === trait.name)) {
//                 Object.getOwnPropertyNames(trait.prototype).forEach((name) => {
//                     Object.defineProperty(
//                         base.prototype,
//                         name,
//                         Object.getOwnPropertyDescriptor(trait.prototype, name) ||
//                         Object.create(null)
//                     );
//                 });
//                 registry.push(trait);
//             }
//         });

//         return newConstructor;
//     }

//     public static applyToInstance(instance: object, traits: Constructor[]) {
//         traits.forEach((trait) => {
//             const dummy = new trait();

//             Object.getOwnPropertyNames(dummy).forEach((name) => {
//                 Object.defineProperty(
//                     instance,
//                     name,
//                     Object.getOwnPropertyDescriptor(dummy, name) ||
//                     Object.create(null)
//                 );
//             });
//         });

//         // console.log("applying mixin for " + instance.constructor.name, instance);
//     }
// }