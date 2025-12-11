"""Configuration constants for SERP API Aggregator."""

# Bright Data API Configuration
BRIGHT_DATA_API_KEY = "66c24ff6fbbf7b6a76b61356d1e6fec4b8d13dd60a1c595e06761360557127ff"
BRIGHT_DATA_ZONE = "serp_api1"
API_BASE_URL = "https://api.brightdata.com"

# Default search parameters
BASE_PARAMS = {
    "gl": "us",
    "hl": "en",
    "brd_json": "1"
}

# Processing defaults
DEFAULT_MAX_PAGES = 25
DEFAULT_CONCURRENCY = 50

# API polling configuration
POLL_INTERVAL = 2  # seconds
MAX_POLLS = 20  # max 40 seconds total wait

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF = 2  # exponential backoff multiplier
