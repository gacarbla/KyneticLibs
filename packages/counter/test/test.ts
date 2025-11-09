import Counter from "../src";

const counter = new Counter(10);

console.log(counter.next);      // 11
console.log(counter.next);      // 12
console.log(counter.previous);  // 11
console.log(counter.value);     // 11

counter.set(100);

console.log(counter.value);     // 100
console.log(counter.next);      // 101
console.log(counter.previous);  // 100

counter.reset();

console.log(counter.value);     // 0