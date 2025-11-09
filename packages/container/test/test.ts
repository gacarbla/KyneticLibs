import Container from '../src';

// --- BasicContainer Example ---
const basic = new Container.Basic<number>();
basic.set('foo', 123);
basic.set('bar', 456);
console.log('BasicContainer foo:', basic.get('foo'));
console.log('BasicContainer bar:', basic.get('bar'));

// --- StrictContainer Example ---
type StrictMap = { foo: number; bar: string, [key: string]: any };
const strict = new Container.Strict<StrictMap>();
strict.set('foo', 42);
strict.set('bar', 'hello');
strict.set('test', false);
console.log('StrictContainer foo:', strict.get('foo'));
console.log('StrictContainer bar:', strict.get('bar'));
console.log('StrictContainer test:', strict.get('test'));

// --- DynamicContainer Example ---
const dyn = new Container.Dynamic<{ initial: boolean }>();
dyn.set('initial', true);
const ndyn = dyn.addKey<'baz', boolean>('baz').addKey<'count', number>('count');
ndyn.set('baz', true);
ndyn.set('count', 99);
console.log('DynamicContainer initial:', ndyn.get('initial'));
console.log('DynamicContainer baz:', ndyn.get('baz'));
console.log('DynamicContainer count:', ndyn.get('count'));