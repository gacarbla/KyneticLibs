import { VersionManager } from "@kyneticweb/versions";

const manager = new VersionManager();

console.log(manager.version); // 0.0.1

manager.setVersion("2.3.0.beta");
console.log(manager.parse()); // { x: "2", G: "beta" }

manager.bump("minor");
console.log(manager.version); // 2.4.0

console.log(manager.compare("2.4.1")); // -1
console.log(manager.satisfies("3.0.0")); // true
