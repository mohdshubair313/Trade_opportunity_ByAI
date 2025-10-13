A FastAPI service that analyzes market data and provides trade opportunity insights for specific sectors in India.

## Features

- 🔍 **Market Data Collection**: Automated web search using DuckDuckGo
- 🤖 **AI Analysis**: Google Gemini API for intelligent market analysis
- 🔐 **Authentication**: JWT-based auth with guest mode support
- ⚡ **Rate Limiting**: IP-based rate limiting to prevent abuse
- 📊 **Structured Reports**: Markdown-formatted analysis reports
- 🛡️ **Security**: Input validation, error handling, and session tracking

## Setup Instructions

### 1. Prerequisites

- Python 3.8 or higher
- Google Gemini API key (get free at: https://aistudio.google.com/app/apikey)

### 2. Installation

```
# Clone or create project directory
mkdir trade-opportunities-api
cd trade-opportunities-api

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
SECRET_KEY=your_secret_key_at_least_32_characters_long_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
RATE_LIMIT_PER_MINUTE=10
```

**Important**: Replace `your_actual_gemini_api_key_here` with your real API key from Google AI Studio.

### 4. Running the Application

```
# Run with uvicorn
uvicorn app.main:app --reload

# Or run directly
python -m app.main
```

The API will be available at: `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### 1. Root Endpoint
```
GET /
```
Returns API information and available endpoints.

### 2. Login (Optional)
```
POST /login
Content-Type: application/json

{
  "username": "demo_user",
  "password": "demo_password"
}
```

Returns JWT token for authenticated requests.

### 3. Analyze Sector (Main Endpoint)
```
GET /analyze/{sector}?save_report=false
Authorization: Bearer <token>  # Optional - works in guest mode too
```

**Example**:
```
# Guest mode (no auth)
curl http://localhost:8000/analyze/pharmaceuticals

# With authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/analyze/technology?save_report=true
```

**Supported Sectors**:
- pharmaceuticals
- technology
- agriculture
- textile
- automotive
- renewable energy
- manufacturing
- healthcare
- fintech
- e-commerce
- And any other sector name!

### 4. Health Check
```
GET /health
```

## Usage Examples

### Using cURL

```
# 1. Login (optional)
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user","password":"demo_password"}'

# Response: {"access_token":"eyJ...","token_type":"bearer"}

# 2. Analyze sector (guest mode)
curl http://localhost:8000/analyze/pharmaceuticals

# 3. Analyze sector (authenticated + save report)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/analyze/technology?save_report=true"
```

### Using Python

```
import requests

# Base URL
BASE_URL = "http://localhost:8000"

# 1. Login (optional)
login_response = requests.post(
    f"{BASE_URL}/login",
    json={"username": "demo_user", "password": "demo_password"}
)
token = login_response.json()["access_token"]

# 2. Analyze sector
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    f"{BASE_URL}/analyze/pharmaceuticals",
    headers=headers,
    params={"save_report": True}
)

report = response.json()
print(report["report"])
```

### Using Postman

1. **Login** (POST): `http://localhost:8000/login`
   - Body (JSON):
     ```
     {
       "username": "demo_user",
       "password": "demo_password"
     }
     ```

2. **Analyze** (GET): `http://localhost:8000/analyze/pharmaceuticals`
   - Authorization: Bearer Token (paste token from login)
   - Params: `save_report=true` (optional)

## Response Format

```
{
  "sector": "pharmaceuticals",
  "report": "# Pharmaceuticals Sector - Trade Opportunities Analysis\n\n...",
  "sources_analyzed": 10,
  "saved_to": "reports/pharmaceuticals_20251012_073000.md",
  "timestamp": "2025-10-12T07:30:00.123456"
}
```

The `report` field contains markdown-formatted analysis with sections:
- Executive Summary
- Market Overview
- Trade Opportunities (Export/Import/Domestic)
- Market Drivers
- Challenges and Risks
- Recommendations
- Key Contacts and Resources

## Security Features

1. **Authentication**: JWT-based with guest mode fallback
2. **Rate Limiting**: 10 requests per minute per IP (configurable)
3. **Input Validation**: Sector name sanitization and validation
4. **Error Handling**: Comprehensive error responses
5. **Session Tracking**: In-memory request tracking per user

## Rate Limits

- Login: 5 requests/minute
- Analyze: 10 requests/minute (configurable in .env)
- General: 100 requests/hour

## Project Structure

```
trade-opportunities-api/
├── app/
│   ├── __init__.py          # Package init
│   ├── main.py              # FastAPI app & routes
│   ├── config.py            # Configuration management
│   ├── auth.py              # Authentication logic
│   ├── rate_limiter.py      # Rate limiting setup
│   ├── data_collector.py    # Web search & data collection
│   ├── ai_analyzer.py       # Gemini AI integration
│   └── report_generator.py  # Report generation & saving
├── reports/                 # Generated reports (auto-created)
├── .env                     # Environment variables
├── requirements.txt         # Dependencies
└── README.md               # This file
```

## Troubleshooting

### Common Issues

1. **Import Errors**:
   ```
   pip install --upgrade -r requirements.txt
   ```

2. **API Key Error**:
   - Verify `.env` file has correct `GEMINI_API_KEY`
   - Get key from: https://aistudio.google.com/app/apikey

3. **Rate Limit Errors**:
   - Wait 60 seconds between requests
   - Adjust `RATE_LIMIT_PER_MINUTE` in `.env`

4. **No Search Results**:
   - Check internet connection
   - Try different sector names
   - DuckDuckGo may have temporary limitations

## Development

### Adding New Features

1. **Custom Authentication**: Modify `app/auth.py`
2. **Different Search Engine**: Update `app/data_collector.py`
3. **AI Model Changes**: Edit `app/ai_analyzer.py`
4. **Rate Limit Adjustments**: Configure in `.env`

### Testing

```
# Run the server
uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/analyze/technology
```

## Performance

- **Average Response Time**: 10-15 seconds per analysis
- **Concurrent Requests**: Supports async processing
- **Memory Usage**: ~100MB (in-memory storage only)

## Limitations

- No persistent database (in-memory only)
- Rate limits apply per IP address
- Search results depend on DuckDuckGo availability
- Gemini API has usage quotas (free tier)

## License

This project is for educational/demo purposes.

## Support

For issues or questions:
1. Check API documentation: `http://localhost:8000/docs`
2. Review logs for error messages
3. Verify all dependencies are installed
4. Ensure `.env` configuration is correct

## Credits

- FastAPI: https://fastapi.tiangolo.com/
- Google Gemini: https://ai.google.dev/
- DuckDuckGo Search: https://pypi.org/project/duckduckgo-search/
- SlowAPI: https://github.com/laurents/slowapi
```

## Running the Application

1. **Install everything**:
```bash
pip install -r requirements.txt
```

2. **Set up your `.env` file** with your actual Gemini API key

3. **Run the server**:
```bash
uvicorn app.main:app --reload
```

4. **Test it**:
```bash
# Simple test
curl http://localhost:8000/analyze/pharmaceuticals

# With save
curl "http://localhost:8000/analyze/technology?save_report=true"
