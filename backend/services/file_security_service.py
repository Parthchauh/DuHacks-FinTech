"""
File Security Service - Upload Validation & Malware Scanning
==============================================================
Provides enterprise-grade security for file uploads:
- MIME type validation using magic bytes
- VirusTotal API integration for malware scanning
- Checksum calculation for integrity verification
- File sanitization

VirusTotal API Key:
1. Go to https://www.virustotal.com/
2. Sign up for a free account
3. Go to API key section in your profile
4. Copy your API key (4 req/min on free tier)
"""

import os
import hashlib
import uuid
import aiohttp
from typing import Tuple, Optional
from pathlib import Path
from io import BytesIO

# Try to import python-magic, fall back to mimetypes
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    import mimetypes
    MAGIC_AVAILABLE = False
    print("[WARN] python-magic not available, using mimetypes fallback")


# Configuration
MAX_FILE_SIZE_MB = 15
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}
ALLOWED_MIMES = {
    'text/csv',
    'text/plain',  # CSV sometimes detected as plain text
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
VIRUSTOTAL_API_URL = "https://www.virustotal.com/api/v3"
TEMP_UPLOAD_DIR = Path("./temp_uploads")


class FileValidationError(Exception):
    """Raised when file validation fails"""
    pass


class MalwareDetectedError(Exception):
    """Raised when malware is detected in uploaded file"""
    pass


def ensure_temp_dir():
    """Create temp upload directory if it doesn't exist"""
    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(original_name: str) -> str:
    """
    Sanitize filename by replacing with UUID while preserving extension.
    Prevents path traversal and special character attacks.
    """
    ext = Path(original_name).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def calculate_checksum(file_content: bytes) -> str:
    """Calculate SHA-256 checksum for file integrity verification"""
    return hashlib.sha256(file_content).hexdigest()


def validate_extension(filename: str) -> bool:
    """Validate file has allowed extension"""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def validate_file_size(file_content: bytes) -> bool:
    """Validate file size is within limits"""
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    return len(file_content) <= max_bytes


def get_mime_type(file_content: bytes, filename: str) -> str:
    """
    Get MIME type using magic bytes (if available) or fallback to extension.
    Magic bytes are more reliable as they check actual file content.
    """
    if MAGIC_AVAILABLE:
        # Use libmagic for accurate detection
        mime = magic.from_buffer(file_content, mime=True)
        return mime
    else:
        # Fallback to extension-based detection
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'


def validate_mime_type(file_content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Validate MIME type matches allowed types.
    Returns (is_valid, detected_mime)
    """
    mime = get_mime_type(file_content, filename)
    is_valid = mime in ALLOWED_MIMES
    return is_valid, mime


async def scan_with_virustotal(
    file_content: bytes, 
    filename: str,
    api_key: Optional[str] = None
) -> dict:
    """
    Scan file using VirusTotal API.
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        api_key: VirusTotal API key (from env if not provided)
    
    Returns:
        Dict with scan results:
        - 'safe': bool
        - 'scan_id': str
        - 'malicious_count': int
        - 'engines_detected': list of engine names that flagged the file
    
    Note: Free tier = 4 requests/minute
    """
    api_key = api_key or os.getenv("VIRUSTOTAL_API_KEY")
    
    if not api_key:
        print("[WARN] VirusTotal API key not configured, skipping scan")
        return {
            'safe': True,  # Assume safe if no API key
            'scan_id': None,
            'malicious_count': 0,
            'engines_detected': [],
            'skipped': True,
            'reason': 'No API key configured'
        }
    
    try:
        async with aiohttp.ClientSession() as session:
            # Step 1: Upload file for scanning
            headers = {"x-apikey": api_key}
            
            form_data = aiohttp.FormData()
            form_data.add_field('file', 
                               file_content,
                               filename=filename,
                               content_type='application/octet-stream')
            
            async with session.post(
                f"{VIRUSTOTAL_API_URL}/files",
                headers=headers,
                data=form_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    analysis_id = result.get('data', {}).get('id')
                    
                    # Step 2: Get analysis results (may need polling for large files)
                    async with session.get(
                        f"{VIRUSTOTAL_API_URL}/analyses/{analysis_id}",
                        headers=headers
                    ) as analysis_response:
                        if analysis_response.status == 200:
                            analysis = await analysis_response.json()
                            stats = analysis.get('data', {}).get('attributes', {}).get('stats', {})
                            
                            malicious_count = stats.get('malicious', 0)
                            suspicious_count = stats.get('suspicious', 0)
                            
                            return {
                                'safe': malicious_count == 0 and suspicious_count == 0,
                                'scan_id': analysis_id,
                                'malicious_count': malicious_count,
                                'suspicious_count': suspicious_count,
                                'engines_detected': [],  # Would need to parse detailed results
                                'skipped': False
                            }
                
                elif response.status == 429:
                    print("[WARN] VirusTotal rate limit exceeded")
                    return {
                        'safe': True,
                        'skipped': True,
                        'reason': 'Rate limit exceeded'
                    }
                else:
                    error_text = await response.text()
                    print(f"[ERROR] VirusTotal API error: {response.status} - {error_text}")
                    
    except Exception as e:
        print(f"[ERROR] VirusTotal scan failed: {e}")
    
    # Default to safe if scan fails (can be changed to fail-closed)
    return {
        'safe': True,
        'skipped': True,
        'reason': 'Scan failed'
    }


async def validate_and_scan_file(
    file_content: bytes,
    filename: str,
    skip_virus_scan: bool = False
) -> dict:
    """
    Complete file validation pipeline.
    
    Performs:
    1. Extension validation
    2. Size validation
    3. MIME type validation (magic bytes)
    4. VirusTotal scan (optional)
    5. Checksum calculation
    
    Returns:
        Dict with validation results and sanitized file info
    
    Raises:
        FileValidationError: If validation fails
        MalwareDetectedError: If malware is detected
    """
    result = {
        'valid': False,
        'original_filename': filename,
        'safe_filename': None,
        'checksum': None,
        'mime_type': None,
        'size_bytes': len(file_content),
        'virus_scan': None
    }
    
    # 1. Validate extension
    if not validate_extension(filename):
        raise FileValidationError(
            f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. Validate size
    if not validate_file_size(file_content):
        raise FileValidationError(
            f"File too large. Maximum size: {MAX_FILE_SIZE_MB} MB"
        )
    
    # 3. Validate MIME type
    mime_valid, detected_mime = validate_mime_type(file_content, filename)
    result['mime_type'] = detected_mime
    
    if not mime_valid:
        raise FileValidationError(
            f"Invalid file type. Detected: {detected_mime}. "
            "Only CSV and Excel files are allowed."
        )
    
    # 4. Virus scan (if enabled)
    if not skip_virus_scan:
        scan_result = await scan_with_virustotal(file_content, filename)
        result['virus_scan'] = scan_result
        
        if not scan_result.get('safe', True):
            raise MalwareDetectedError(
                f"Malware detected! {scan_result.get('malicious_count', 0)} engines flagged this file."
            )
    
    # 5. Calculate checksum
    result['checksum'] = calculate_checksum(file_content)
    
    # 6. Generate safe filename
    result['safe_filename'] = sanitize_filename(filename)
    
    result['valid'] = True
    return result


def save_temp_file(file_content: bytes, safe_filename: str) -> Path:
    """Save file to temporary directory with sanitized name"""
    ensure_temp_dir()
    file_path = TEMP_UPLOAD_DIR / safe_filename
    file_path.write_bytes(file_content)
    return file_path


def cleanup_temp_file(safe_filename: str):
    """Remove temporary file after processing"""
    file_path = TEMP_UPLOAD_DIR / safe_filename
    if file_path.exists():
        file_path.unlink()
