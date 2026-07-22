/**
 * Safe localStorage utilities to prevent QuotaExceededError or security restrictions from crashing the application.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`LocalStorage write failed for key "${key}":`, error);
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`LocalStorage read failed for key "${key}":`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`LocalStorage remove failed for key "${key}":`, error);
    return false;
  }
}
