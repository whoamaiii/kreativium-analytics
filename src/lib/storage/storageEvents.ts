/**
 * @file Storage event system for cross-component reactivity.
 */

type EventType =
  | 'students'
  | 'sessions'
  | 'goals'
  | 'alerts'
  | 'xp'
  | 'settings';

const EVENT_PREFIX = 'kreativium-storage::';

const safeEventTarget = (() => {
  if (typeof window !== 'undefined' && typeof window.EventTarget !== 'undefined') {
    return new window.EventTarget();
  }
  if (typeof EventTarget !== 'undefined') {
    return new EventTarget();
  }
  return null;
})();

export const emitStorageEvent = (type: EventType): void => {
  if (!safeEventTarget || typeof CustomEvent === 'undefined') return;
  const eventName = `${EVENT_PREFIX}${type}`;
  safeEventTarget.dispatchEvent(new CustomEvent(eventName));
};

export const subscribeStorageEvent = (type: EventType, callback: () => void): (() => void) => {
  if (!safeEventTarget) {
    return () => {};
  }
  const eventName = `${EVENT_PREFIX}${type}`;
  const handler = () => {
    callback();
  };
  safeEventTarget.addEventListener(eventName, handler);
  return () => {
    safeEventTarget.removeEventListener(eventName, handler);
  };
};



