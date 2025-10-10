#!/usr/bin/env python3
"""
dYdX Alert CLI - Self-hosted liquidation alerting tool
"""
import sys
import webbrowser
import subprocess
import time
import threading
from pathlib import Path


def open_browser_delayed():
    """Open browser after server has started"""
    time.sleep(3)  # Wait for server to start
    try:
        webbrowser.open("http://localhost:8000/docs")
        print("\n✓ Opening browser at http://localhost:8000/docs")
    except Exception as e:
        print(f"\nCouldn't open browser automatically: {e}")
        print("Please open http://localhost:8000/docs manually")


def main():
    """Main CLI entry point"""
    print("=" * 60)
    print("dYdX Alert - Liquidation & Deleveraging Monitoring Tool")
    print("=" * 60)
    print()

    # Check if running in development or installed mode
    app_dir = Path(__file__).parent.parent

    print("Starting dYdX Alert server...")
    print(f"API Server: http://localhost:8000")
    print(f"API Docs: http://localhost:8000/docs")
    print()
    print("The browser will open automatically in a few seconds...")
    print("Press Ctrl+C to stop the server")
    print()

    # Start browser opening in background thread
    browser_thread = threading.Thread(target=open_browser_delayed, daemon=True)
    browser_thread.start()

    try:
        # Start the FastAPI server
        subprocess.run(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
            ]
        )
    except KeyboardInterrupt:
        print("\nShutting down dYdX Alert...")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
