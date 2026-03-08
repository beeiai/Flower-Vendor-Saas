"""
pytest configuration file.
Disables caching in test environment to prevent flaky tests.
"""
import os
import pytest
from unittest.mock import patch

# Disable caching in test environment
os.environ['CACHE_ENABLED'] = 'False'


@pytest.fixture(autouse=True)
def disable_cache_globally():
    """
    Globally disable caching during tests to prevent flaky behavior.
    This ensures tests are deterministic and don't depend on cached values.
    """
    with patch('app.utils.cache.cache.get', return_value=None):
        with patch('app.utils.cache.cache.set', return_value=None):
            with patch('app.utils.cache.cached_per_request', lambda *args, **kwargs: lambda f: f):
                with patch('app.utils.cache.cached', lambda *args, **kwargs: lambda f: f):
                    yield