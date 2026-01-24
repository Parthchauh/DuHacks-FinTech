"""
OptiWealth Backend - Input Sanitization & Validation
======================================================
Centralized input sanitization to prevent:
- SQL Injection (handled by SQLAlchemy ORM)
- XSS (Cross-Site Scripting)
- Command Injection
- Path Traversal
"""

import re
import html
from typing import Any, Optional
import bleach


def sanitize_html(input_string: Optional[str]) -> str:
    """
    Sanitize HTML input to prevent XSS attacks.
    
    - Escapes HTML entities
    - Removes script tags and event handlers
    - Allows only safe tags
    """
    if not input_string:
        return ""
    
    # Define allowed tags and attributes
    allowed_tags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li']
    allowed_attrs = {'a': ['href', 'title']}
    
    # Clean with bleach
    cleaned = bleach.clean(
        input_string,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )
    
    return cleaned


def escape_html(input_string: Optional[str]) -> str:
    """
    Escape all HTML characters.
    Use when no HTML should be allowed.
    """
    if not input_string:
        return ""
    return html.escape(input_string, quote=True)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks.
    
    - Removes path separators
    - Removes null bytes
    - Limits length
    """
    if not filename:
        return ""
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Remove path separators
    filename = re.sub(r'[\\/:*?"<>|]', '', filename)
    
    # Remove path traversal patterns
    filename = re.sub(r'\.\.+', '', filename)
    
    # Limit length
    return filename[:255]


def sanitize_sql_identifier(identifier: str) -> str:
    """
    Sanitize SQL identifiers (table/column names).
    Only allow alphanumeric and underscore.
    
    Note: SQLAlchemy ORM already handles SQL injection for values.
    This is for dynamic column names if needed.
    """
    if not identifier:
        return ""
    return re.sub(r'[^a-zA-Z0-9_]', '', identifier)


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_ticker(ticker: str) -> bool:
    """Validate stock ticker format (1-10 alphanumeric characters)."""
    pattern = r'^[A-Z0-9]{1,10}$'
    return bool(re.match(pattern, ticker.upper()))


def sanitize_search_query(query: str) -> str:
    """
    Sanitize search query input.
    
    - Remove special characters that could cause issues
    - Limit length
    - Trim whitespace
    """
    if not query:
        return ""
    
    # Remove control characters
    query = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', query)
    
    # Remove SQL comment patterns
    query = re.sub(r'(--|/\*|\*/|;)', '', query)
    
    # Trim and limit length
    return query.strip()[:100]


def validate_password_chars(password: str) -> bool:
    """
    Validate password contains only allowed characters.
    Prevents injection via password field.
    """
    # Allow printable ASCII characters
    return all(32 <= ord(c) <= 126 for c in password)


class InputValidator:
    """
    Centralized input validation class.
    Use for consistent validation across the application.
    """
    
    @staticmethod
    def validate_name(name: str, min_length: int = 1, max_length: int = 100) -> tuple[bool, str]:
        """Validate a name field."""
        if not name or len(name.strip()) < min_length:
            return False, f"Name must be at least {min_length} characters"
        if len(name) > max_length:
            return False, f"Name must be at most {max_length} characters"
        if re.search(r'[<>"\']', name):
            return False, "Name contains invalid characters"
        return True, ""
    
    @staticmethod
    def validate_amount(amount: float, min_val: float = 0, max_val: float = 1e15) -> tuple[bool, str]:
        """Validate a monetary amount."""
        if amount < min_val:
            return False, f"Amount must be at least {min_val}"
        if amount > max_val:
            return False, f"Amount exceeds maximum allowed"
        return True, ""
    
    @staticmethod
    def validate_percentage(value: float) -> tuple[bool, str]:
        """Validate a percentage value (0-100)."""
        if value < 0:
            return False, "Percentage cannot be negative"
        if value > 100:
            return False, "Percentage cannot exceed 100"
        return True, ""
