"""
Simple in-memory cache for frequently accessed data
Reduces database queries for static/semi-static content
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger(__name__)

class SimpleCache:
    """Thread-safe in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        async with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if datetime.utcnow() < entry['expires']:
                    return entry['value']
                else:
                    # Expired, remove it
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 minutes)"""
        async with self._lock:
            self._cache[key] = {
                'value': value,
                'expires': datetime.utcnow() + timedelta(seconds=ttl_seconds)
            }
    
    async def delete(self, key: str):
        """Delete a specific key from cache"""
        async with self._lock:
            self._cache.pop(key, None)
    
    async def clear_pattern(self, pattern: str):
        """Clear all keys matching a pattern"""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
    
    async def clear_all(self):
        """Clear all cached data"""
        async with self._lock:
            self._cache.clear()
    
    def stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            'total_keys': len(self._cache),
            'memory_entries': len(self._cache)
        }

# Global cache instance
cache = SimpleCache()

# Cache key generators
def settings_key() -> str:
    return "settings:global"

def branding_key() -> str:
    return "branding:global"

def news_list_key(page: int = 1, limit: int = 10) -> str:
    return f"news:list:{page}:{limit}"

def events_list_key(upcoming: bool = True) -> str:
    return f"events:list:{'upcoming' if upcoming else 'all'}"

def gallery_key(album_id: str = "all") -> str:
    return f"gallery:{album_id}"

def stories_key(page: int = 1) -> str:
    return f"stories:page:{page}"

def user_key(user_id: str) -> str:
    return f"user:{user_id}"

# Cache TTLs (in seconds)
CACHE_TTL = {
    'settings': 600,      # 10 minutes
    'branding': 600,      # 10 minutes
    'news': 300,          # 5 minutes
    'events': 300,        # 5 minutes
    'gallery': 600,       # 10 minutes
    'stories': 600,       # 10 minutes
    'user': 120,          # 2 minutes
}
