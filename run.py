import uvicorn

if __name__ == "__main__":
    print("==================================================")
    print("🚀 Care Connect Production Web Server Starting")
    print("📍 URL: http://localhost:8000")
    print("==================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
