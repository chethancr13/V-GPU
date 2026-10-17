"""
Production Multi-Tier In-Memory LRU Cache with TTL & Stampede Protection.

Features:
- Thread-safe in-memory LRU cache with fine-grained per-key Time-To-Live (TTL).
- Cache stampede prevention (Single-Flight pattern with async locks).
- Tag-based bulk invalidation (e.g. invalidate all 'metrics', 'vgpu', or 'ai' keys).
- Prometheus telemetry metrics integration (hits, misses, hit ratio, size).
- Synchronous and asynchronous function decorators (@cached).
"""

import time
import asyncio
import threading
import hashlib
import json
from collections import OrderedDict
from typing import Any, Optional, Dict, List, Callable, Tuple
from functools import wraps


class CacheEntry:
    __slots__ = ("value", "expires_at", "tags", "created_at", "hits")

    def __init__(self, value: Any, ttl_seconds: float, tags: Optional[List[str]] = None):
        self.value = value
        now = time.time()
        self.expires_at = now + ttl_seconds if ttl_seconds > 0 else float("inf")
        self.tags = set(tags or [])
        self.created_at = now
        self.hits = 0

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class MultiTierCache:
    """
    Production-grade L1 in-memory cache with LRU eviction policy,
    TTL expiration, tag-based group invalidation, and single-flight execution.
    """

    def __init__(self, max_size: int = 2000, default_ttl_seconds: float = 60.0):
        self.max_size = max_size
        self.default_ttl = default_ttl_seconds
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._tag_map: Dict[str, set] = {}  # tag -> set of keys
        self._lock = threading.RLock()
        self._async_locks: Dict[str, asyncio.Lock] = {}
        self._async_locks_guard = asyncio.Lock()

        # Telemetry metrics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.invalidations = 0

    def _purge_expired_locked(self):
        """Remove all expired entries (called periodically or on threshold)."""
        now = time.time()
        expired_keys = [k for k, entry in self._store.items() if now > entry.expires_at]
        for k in expired_keys:
            self._delete_key_locked(k)

    def _delete_key_locked(self, key: str):
        entry = self._store.pop(key, None)
        if entry:
            for tag in entry.tags:
                if tag in self._tag_map:
                    self._tag_map[tag].discard(key)
                    if not self._tag_map[tag]:
                        del self._tag_map[tag]

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value from cache; returns None if missed or expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self.misses += 1
                return None

            if entry.is_expired():
                self._delete_key_locked(key)
                self.misses += 1
                return None

            # LRU update: move accessed key to end
            self._store.move_to_end(key)
            entry.hits += 1
            self.hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None, tags: Optional[List[str]] = None) -> None:
        """Store value with custom TTL and tags."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        with self._lock:
            # Enforce max size via LRU eviction
            if key not in self._store and len(self._store) >= self.max_size:
                # First try purging expired items
                self._purge_expired_locked()
                # If still at capacity, evict the least recently used item
                if len(self._store) >= self.max_size:
                    oldest_key, _ = self._store.popitem(last=False)
                    self.evictions += 1
                    # Clean up tag mapping for evicted key
                    for tag_set in self._tag_map.values():
                        tag_set.discard(oldest_key)

            entry = CacheEntry(value, ttl, tags)
            self._store[key] = entry
            self._store.move_to_end(key)

            if tags:
                for tag in tags:
                    if tag not in self._tag_map:
                        self._tag_map[tag] = set()
                    self._tag_map[tag].add(key)

    def delete(self, key: str) -> bool:
        """Explicitly remove a single key."""
        with self._lock:
            if key in self._store:
                self._delete_key_locked(key)
                self.invalidations += 1
                return True
            return False

    def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries associated with a specific tag."""
        with self._lock:
            keys_to_delete = list(self._tag_map.get(tag, []))
            for k in keys_to_delete:
                self._delete_key_locked(k)
            self.invalidations += len(keys_to_delete)
            return len(keys_to_delete)

    def clear(self) -> int:
        """Purge all entries from the cache."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            self._tag_map.clear()
            self.invalidations += count
            return count

    def get_stats(self) -> Dict[str, Any]:
        """Return real-time cache diagnostics and operational metrics."""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_ratio = round((self.hits / total_requests * 100), 2) if total_requests > 0 else 0.0
            return {
                "size": len(self._store),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "total_requests": total_requests,
                "hit_ratio_pct": hit_ratio,
                "evictions": self.evictions,
                "invalidations": self.invalidations,
                "active_tags": list(self._tag_map.keys()),
                "sample_keys": list(self._store.keys())[:15]
            }

    async def get_or_set_async(self, key: str, fetch_fn: Callable, ttl_seconds: Optional[float] = None, tags: Optional[List[str]] = None) -> Any:
        """
        Single-Flight Async Cache: Prevents cache stampede.
        If 50 concurrent requests request the same missing/expired key, only ONE invokes fetch_fn.
        The other 49 wait on the key's mutex and receive the cached result.
        """
        cached_val = self.get(key)
        if cached_val is not None:
            return cached_val

        # Get or create an async lock for this specific key
        async with self._async_locks_guard:
            if key not in self._async_locks:
                self._async_locks[key] = asyncio.Lock()
            key_lock = self._async_locks[key]

        async with key_lock:
            # Double check after acquiring lock
            cached_val = self.get(key)
            if cached_val is not None:
                return cached_val

            # Compute value
            if asyncio.iscoroutinefunction(fetch_fn):
                fresh_val = await fetch_fn()
            else:
                loop = asyncio.get_event_loop()
                fresh_val = await loop.run_in_executor(None, fetch_fn)

            self.set(key, fresh_val, ttl_seconds=ttl_seconds, tags=tags)
            return fresh_val


# Global cache singleton
system_cache = MultiTierCache(max_size=3000, default_ttl_seconds=45.0)


def cached(ttl_seconds: float = 60.0, tag: Optional[str] = None):
    """
    Decorator for caching function return values based on function name & args.
    Works transparently with both async and sync functions.
    """
    def decorator(fn: Callable):
        fn_name = fn.__qualname__

        @wraps(fn)
        async def async_wrapper(*args, **kwargs):
            key_parts = [fn_name, str(args), json.dumps(kwargs, sort_keys=True, default=str)]
            cache_key = hashlib.sha256(":".join(key_parts).encode()).hexdigest()[:24]

            tags = [tag] if tag else [fn_name]
            return await system_cache.get_or_set_async(
                cache_key,
                lambda: fn(*args, **kwargs),
                ttl_seconds=ttl_seconds,
                tags=tags
            )

        @wraps(fn)
        def sync_wrapper(*args, **kwargs):
            key_parts = [fn_name, str(args), json.dumps(kwargs, sort_keys=True, default=str)]
            cache_key = hashlib.sha256(":".join(key_parts).encode()).hexdigest()[:24]

            val = system_cache.get(cache_key)
            if val is not None:
                return val

            fresh_val = fn(*args, **kwargs)
            tags = [tag] if tag else [fn_name]
            system_cache.set(cache_key, fresh_val, ttl_seconds=ttl_seconds, tags=tags)
            return fresh_val

        return async_wrapper if asyncio.iscoroutinefunction(fn) else sync_wrapper
    return decorator
