import models
from database import engine, Base

def reset_database():
    print("WARNING: This will wipe all data from the database.")
    print("Dropping all tables...")
    try:
        # Drop all tables defined in models
        Base.metadata.drop_all(bind=engine)
        print("All tables dropped.")
        
        print("Recreating tables from models...")
        # Create all tables based on current code
        Base.metadata.create_all(bind=engine)
        print("Database schema recreated successfully.")
        
    except Exception as e:
        print(f"Error resetting database: {e}")

if __name__ == "__main__":
    reset_database()
