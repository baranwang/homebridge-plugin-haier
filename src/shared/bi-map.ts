export class BiMap<Key, Value> {
  keyToValue = new Map<Key, Value>();
  valueToKey = new Map<Value, Key>();

  constructor(entries?: [Key, Value][]) {
    this.clear();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  set(key: Key, value: Value) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  get(key: Key): Value | undefined {
    return this.keyToValue.get(key);
  }

  getKey(value: Value): Key | undefined {
    return this.valueToKey.get(value);
  }

  delete(key: Key) {
    const value = this.keyToValue.get(key);
    this.keyToValue.delete(key);
    if (value !== undefined) {
      this.valueToKey.delete(value);
    }
  }

  has(key: Key): boolean {
    return this.keyToValue.has(key);
  }

  hasValue(value: Value): boolean {
    return this.valueToKey.has(value);
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }

  values() {
    return this.keyToValue.values();
  }
}
