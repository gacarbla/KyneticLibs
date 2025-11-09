import { VersionManager } from '../src';

const vm = new VersionManager();

console.log(vm.version);

vm.setVersion('2.3.0.beta');

console.log(vm.version);