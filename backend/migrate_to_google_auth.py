import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        return

    print("Connecting to database...")
    result = urlparse(DATABASE_URL)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port
    
    conn = psycopg2.connect(
        database=database,
        user=username,
        password=password,
        host=hostname,
        port=port
    )
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Checking/Adding google_id column...")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;")
        print("Done.")

        print("Checking/Adding auth_provider column...")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email';")
        print("Done.")
        
        print("Checking/Adding allowed_ips column...")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_ips TEXT;")
        print("Done.")

        print("Checking/Adding email_preferences column...")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences TEXT;")
        print("Done.")

        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration error: {e}")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
