import os

import uvicorn

PORT = int(os.getenv("PORT", "8000"))
RELOAD = os.getenv("FASTAPI_RELOAD", "false").lower() in {"1", "true", "yes", "on"}

if __name__ == "__main__":
    print("==================================================")
    print("🚀 Care Connect Production Web Server Starting")
    print(f"📍 URL: http://localhost:{PORT}")
    print("==================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=PORT, reload=RELOAD)
