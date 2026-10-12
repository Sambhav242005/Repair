#!/usr/bin/env python3
"""
Reset and seed the Repair database with demo fixtures.
Usage: python3 scripts/reset_db.py
"""
import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.seed import seed_database

if __name__ == "__main__":
    print("Resetting and seeding database...")
    seed_database(reset=True)
    print("Database successfully reset and re-seeded.")
