import { Counter } from "@kyneticweb/counter";

const counter = new Counter(10);

console.log(counter.increment().value); // 11
console.log(counter.increment(5).value); // 16
console.log(counter.decrement(2).value); // 14

counter.set(100).increment();
console.log(counter.value); // 101

counter.reset();
console.log(counter.value); // 10
