import { BasicContainer, DynamicContainer, StrictContainer } from "@kyneticweb/container";

interface Settings {
    theme: string;
    compact: boolean;
}

const settings = new StrictContainer<Settings>({ theme: "dark" });
settings.set("compact", true);
console.log(settings.toJSON()); // { theme: "dark", compact: true }

const scores = new BasicContainer<number>({ alice: 10 });
scores.set("bob", 8);
console.log(scores.getOrThrow("bob")); // 8

const base = new DynamicContainer();
const extended = base.withValue("count", 3);
console.log(extended.getOrThrow("count")); // 3
console.log(base.size); // 0: the original is unchanged
