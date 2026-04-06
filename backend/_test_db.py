"""Quick DB and registration test."""
import sys
sys.path.insert(0, '.')

# Test 1: Database connectivity
print("=== TEST 1: Database Connection ===")
try:
    from database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print(f"  DB Connection: OK ({result.fetchone()})")
except Exception as e:
    print(f"  DB Connection: FAILED - {e}")

# Test 2: Table existence
print("\n=== TEST 2: Users Table ===")
try:
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"  Tables: {tables}")
    if 'users' in tables:
        columns = [c['name'] for c in inspector.get_columns('users')]
        print(f"  Users columns: {columns}")
    else:
        print("  WARNING: 'users' table does not exist!")
except Exception as e:
    print(f"  Table check: FAILED - {e}")

# Test 3: Try registration validation
print("\n=== TEST 3: Password Validation ===")
try:
    from services.auth_service import validate_password_strength
    
    test_passwords = [
        "abc",           # Too short
        "abcdefgh",      # No uppercase, digit, special
        "Abcdefgh1",     # No special char
        "Abcdefgh1!",    # Valid
    ]
    for pw in test_passwords:
        valid, msg, score = validate_password_strength(pw)
        print(f"  '{pw}' -> valid={valid}, msg='{msg}', score={score}")
except Exception as e:
    print(f"  Validation test: FAILED - {e}")

# Test 4: Try to create a user via the schema
print("\n=== TEST 4: Schema Validation ===")
try:
    from schemas import UserCreate
    user = UserCreate(email="test@example.com", password="TestPass1!", full_name="Test User")
    print(f"  Schema OK: {user}")
except Exception as e:
    print(f"  Schema: FAILED - {e}")

# Test 5: Check if user already exists  
print("\n=== TEST 5: Existing Users ===")
try:
    from database import SessionLocal
    import models
    db = SessionLocal()
    users = db.query(models.User).all()
    print(f"  Found {len(users)} user(s)")
    for u in users:
        print(f"    - id={u.id}, email={u.email}, provider={u.auth_provider}")
    db.close()
except Exception as e:
    print(f"  User query: FAILED - {e}")
