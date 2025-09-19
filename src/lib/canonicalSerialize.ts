/*
  canonicalSerialize(value: unknown): string
  - Order-insensitive and type-stable canonical serialization with explicit type prefixes
  - Primitives: 
    string   => s:"...escaped..."
    number   => n:<normalized> (NaN, Infinity, -Infinity; -0 serialized as 0)
    boolean  => b:true|false
    null     => l:null
    undefined=> u:undefined
    bigint   => g:<decimal>
  - Date     => d:<toISOString()>
  - RegExp   => r:<regex.toString()>
  - Array    => a:[<items...>] where items are canonicalized then sorted lexicographically
  - Set      => a:[<items...>] (same as Array, order-insensitive)
  - Map      => o:{<k>:<v>,...} where k and v are canonicalized; entries sorted by canonical key
  - Object   => o:{<k>:<v>,...} own enumerable keys sorted lexicographically (k is JSON-escaped string)
  - Typed arrays, ArrayBuffer, DataView => convert to array of numbers and treat as Array (order-insensitive)
  - Fallback => x:<[object Type]> optionally followed by props as o:{...} if enumerable props exist
  - Circular structures => throw descriptive error
*/

export function canonicalSerialize(value: unknown): string {
  const seen = new WeakSet<object>();

  function escapeJSONString(s: string): string {
    // JSON.stringify returns a quoted string with proper escaping
    return JSON.stringify(s) as string;
  }

  function numberToNormalized(n: number): string {
    if (Number.isNaN(n)) return 'n:NaN';
    if (n === Infinity) return 'n:Infinity';
    if (n === -Infinity) return 'n:-Infinity';
    // Treat -0 as 0
    const val = Object.is(n, -0) ? 0 : n;
    // Use toString for canonical JS numeric rendering
    return `n:${val.toString()}`;
  }

  function bigintToNormalized(b: bigint): string {
    return `g:${b.toString()}`;
  }

  function dateToNormalized(d: Date): string {
    return `d:${d.toISOString()}`;
  }

  function regexpToNormalized(r: RegExp): string {
    return `r:${r.toString()}`;
  }

  function arraybufferLikeToNumbers(input: ArrayBuffer | ArrayBufferView | DataView): number[] {
    if (input instanceof DataView) {
      const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      return Array.from(bytes);
    }
    if (ArrayBuffer.isView(input as ArrayBufferView)) {
      const v = input as ArrayBufferView;
      const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      return Array.from(bytes);
    }
    // ArrayBuffer
    const ab = input as ArrayBuffer;
    const bytes = new Uint8Array(ab);
    return Array.from(bytes);
  }

  function isPlainObject(obj: unknown): obj is Record<string, unknown> {
    if (obj === null || typeof obj !== 'object') return false;
    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
  }

  function serialize(v: unknown): string {
    // Primitives and special cases
    if (v === null) return 'l:null';
    const t = typeof v;
    switch (t) {
      case 'string':
        return `s:${escapeJSONString(v as string)}`;
      case 'number':
        return numberToNormalized(v as number);
      case 'boolean':
        return `b:${(v as boolean) ? 'true' : 'false'}`;
      case 'undefined':
        return 'u:undefined';
      case 'bigint':
        return bigintToNormalized(v as bigint);
      case 'symbol': {
        // Fallback path for symbols
        const desc = (v as symbol).description;
        const tag = desc !== undefined ? `Symbol(${desc})` : 'Symbol()';
        return `x:[object Symbol]${serializeSymbolProps(v as symbol, tag)}`;
      }
      case 'function': {
        // Functions typically have no enumerable own props; include name for stability
        const fn = v as (...args: unknown[]) => unknown;
        const name = fn.name || 'anonymous';
        return `x:[object Function]${serializeMaybeProps(fn)}`.replace('[object Function]', `[object Function ${name}]`);
      }
      case 'object':
        break; // handled below
      default:
        // Should not reach here, but provide safe fallback
        return `x:${Object.prototype.toString.call(v)}`;
    }

    // Objects (non-null)
    const obj = v as object;
    if (seen.has(obj)) {
      throw new TypeError('canonicalSerialize: Cannot serialize circular structure');
    }

    // Well-known built-ins
    if (obj instanceof Date) return dateToNormalized(obj);
    if (obj instanceof RegExp) return regexpToNormalized(obj);

    // Array and Array-like handling
    if (Array.isArray(obj)) {
      seen.add(obj);
      const items = obj.map((it) => serialize(it));
      items.sort();
      seen.delete(obj);
      return `a:[${items.join(',')}]`;
    }

    // Typed arrays, ArrayBuffer, DataView -> numbers array
    if (
      typeof ArrayBuffer !== 'undefined' &&
      (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj) || obj instanceof DataView)
    ) {
      const nums = arraybufferLikeToNumbers(obj as any);
      // Serialize as numbers, then sort for order-insensitivity
      const serialized = nums.map((n) => numberToNormalized(n));
      serialized.sort();
      return `a:[${serialized.join(',')}]`;
    }

    // Set -> order-insensitive array of serialized items
    if (obj instanceof Set) {
      seen.add(obj);
      const items = Array.from(obj.values()).map((it) => serialize(it));
      items.sort();
      seen.delete(obj);
      return `a:[${items.join(',')}]`;
    }

    // Map -> entries sorted by canonical key
    if (obj instanceof Map) {
      seen.add(obj);
      const entries = Array.from(obj.entries()).map(([k, val]) => [serialize(k), serialize(val)] as const);
      entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      const body = entries.map(([k, val]) => `${k}:${val}`).join(',');
      seen.delete(obj);
      return `o:{${body}}`;
    }

    // Plain object
    if (isPlainObject(obj)) {
      seen.add(obj);
      const rec = obj as Record<string, unknown>;
      const keys = Object.keys(rec).sort();
      const parts: string[] = [];
      for (const k of keys) {
        const v2 = rec[k];
        parts.push(`${escapeJSONString(k)}:${serialize(v2)}`);
      }
      seen.delete(obj);
      return `o:{${parts.join(',')}}`;
    }

    // Fallback for unknown instances: include tag + enumerable props if any
    const tag = Object.prototype.toString.call(obj); // e.g., [object Error]
    const props = serializeMaybeProps(obj);
    return `x:${tag}${props}`;
  }

  function serializeMaybeProps(obj: object): string {
    const rec = obj as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 0) return '';
    keys.sort();
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(`${escapeJSONString(k)}:${serialize(rec[k])}`);
    }
    return `,o:{${parts.join(',')}}`;
  }

  function serializeSymbolProps(_sym: symbol, _tag: string): string {
    // Symbols have no enumerable string keys; no additional props
    return '';
  }

  return serialize(value);
}
