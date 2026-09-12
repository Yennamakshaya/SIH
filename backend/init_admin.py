"""
Standalone script to safely initialize or verify the KisanLink Admin account.
Usage:
    python init_admin.py
"""
import sys
from app.database import SessionLocal
from app.seed import init_admin_account

def main():
    db = SessionLocal()
    try:
        admin = init_admin_account(db)
        print(f"Admin seed status: READY (ID: {admin.id}, Username: {admin.username}, Role: {admin.role}, Status: {admin.status})")
    except Exception as e:
        print(f"Error initializing Admin account: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
