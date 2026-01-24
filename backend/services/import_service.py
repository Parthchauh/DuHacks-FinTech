"""
Import Service - Smart Data Extraction from Broker Exports
============================================================
Parses CSV/Excel files exported from Indian stock brokers and 
automatically extracts relevant holdings data.

Supported Brokers:
- Zerodha Kite
- Angel One
- Upstox
- Groww
- Generic CSV/Excel

Smart column detection finds the right data even if files have extra columns.
"""

import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from io import BytesIO
from datetime import datetime


# Column pattern matching for smart detection
TICKER_PATTERNS = [
    'symbol', 'ticker', 'stock', 'scrip', 'script', 'security', 
    'instrument', 'tradingsymbol', 'trading symbol', 'isin',
    'stock symbol', 'share', 'name', 'stock name', 'company'
]

PRICE_PATTERNS = [
    'buy price', 'avg price', 'average price', 'avg', 'average',
    'price', 'cost', 'cost price', 'purchase price', 'buy avg',
    'ltp', 'last price', 'closing price', 'buy rate', 'rate'
]

QUANTITY_PATTERNS = [
    'qty', 'quantity', 'units', 'shares', 'holding', 'holdings',
    'no.', 'nos', 'number', 'total qty', 'net qty', 'available qty',
    'free qty', 'balance', 'stock qty', 'total shares'
]

# Optional but useful columns
NAME_PATTERNS = [
    'company name', 'company', 'name', 'security name', 'stock name',
    'description', 'scrip name'
]

VALUE_PATTERNS = [
    'value', 'current value', 'market value', 'total value',
    'present value', 'holding value'
]


class ImportError(Exception):
    """Raised when import parsing fails"""
    pass


def _normalize_column_name(col: str) -> str:
    """Normalize column name for pattern matching"""
    return col.lower().strip().replace('_', ' ').replace('-', ' ')


def _find_column(df: pd.DataFrame, patterns: List[str]) -> Optional[str]:
    """
    Find a column matching any of the patterns.
    Returns the first matching column name or None.
    """
    normalized_cols = {_normalize_column_name(col): col for col in df.columns}
    
    for pattern in patterns:
        # Exact match
        if pattern in normalized_cols:
            return normalized_cols[pattern]
        
        # Partial match
        for norm_col, orig_col in normalized_cols.items():
            if pattern in norm_col:
                return orig_col
    
    return None


def _detect_broker(df: pd.DataFrame) -> str:
    """
    Attempt to detect which broker exported the file based on column patterns.
    """
    cols_lower = [c.lower() for c in df.columns]
    
    # Zerodha patterns
    if 'tradingsymbol' in cols_lower or 'instrument' in cols_lower:
        return 'zerodha'
    
    # Angel One patterns
    if 'scrip name' in ' '.join(cols_lower) or 'angel' in ' '.join(cols_lower):
        return 'angelone'
    
    # Upstox patterns
    if 'upstox' in ' '.join(cols_lower):
        return 'upstox'
    
    # Groww patterns
    if 'folio' in cols_lower:
        return 'groww'
    
    return 'generic'


def parse_csv(file_content: bytes) -> pd.DataFrame:
    """Parse CSV file content into DataFrame"""
    try:
        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                df = pd.read_csv(BytesIO(file_content), encoding=encoding)
                if len(df.columns) > 1:  # Valid CSV
                    return df
            except UnicodeDecodeError:
                continue
        
        raise ImportError("Could not decode CSV file. Please ensure it's properly encoded.")
    
    except pd.errors.EmptyDataError:
        raise ImportError("The CSV file is empty.")
    except pd.errors.ParserError as e:
        raise ImportError(f"Could not parse CSV: {str(e)}")


def parse_excel(file_content: bytes) -> pd.DataFrame:
    """Parse Excel file content into DataFrame"""
    try:
        # Try reading the first sheet
        df = pd.read_excel(BytesIO(file_content), sheet_name=0)
        
        # If first row looks like a header row, it's already correct
        # Otherwise, try to find the actual header row
        if df.empty:
            raise ImportError("The Excel file is empty.")
        
        return df
    
    except Exception as e:
        raise ImportError(f"Could not parse Excel file: {str(e)}")


def parse_file(file_content: bytes, filename: str) -> pd.DataFrame:
    """Parse file based on extension"""
    ext = Path(filename).suffix.lower()
    
    if ext == '.csv':
        return parse_csv(file_content)
    elif ext in ['.xlsx', '.xls']:
        return parse_excel(file_content)
    else:
        raise ImportError(f"Unsupported file format: {ext}")


def extract_holdings(
    file_content: bytes, 
    filename: str,
    override_mappings: Optional[Dict[str, str]] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract holdings data from file.
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        override_mappings: Optional manual column mappings
            e.g., {"ticker": "Stock Symbol", "price": "Buy Rate", "quantity": "Units"}
    
    Returns:
        Tuple of (holdings_list, metadata)
        - holdings_list: List of dicts with ticker, price, quantity, name
        - metadata: Dict with detected_broker, column_mappings, total_rows
    """
    # Parse file
    df = parse_file(file_content, filename)
    
    if df.empty:
        raise ImportError("No data found in file.")
    
    # Detect broker for logging
    detected_broker = _detect_broker(df)
    
    # Find required columns
    if override_mappings:
        ticker_col = override_mappings.get('ticker')
        price_col = override_mappings.get('price')
        quantity_col = override_mappings.get('quantity')
        name_col = override_mappings.get('name')
    else:
        ticker_col = _find_column(df, TICKER_PATTERNS)
        price_col = _find_column(df, PRICE_PATTERNS)
        quantity_col = _find_column(df, QUANTITY_PATTERNS)
        name_col = _find_column(df, NAME_PATTERNS)
    
    # Validate required columns found
    if not ticker_col:
        raise ImportError(
            f"Could not find ticker/symbol column. "
            f"Available columns: {list(df.columns)}"
        )
    
    if not price_col:
        raise ImportError(
            f"Could not find price column. "
            f"Available columns: {list(df.columns)}"
        )
    
    if not quantity_col:
        raise ImportError(
            f"Could not find quantity column. "
            f"Available columns: {list(df.columns)}"
        )
    
    # Extract holdings
    holdings = []
    errors = []
    
    for idx, row in df.iterrows():
        try:
            ticker = str(row[ticker_col]).strip().upper()
            
            # Skip empty rows
            if not ticker or ticker == 'NAN' or ticker == '':
                continue
            
            # Parse price (handle different formats)
            price_raw = row[price_col]
            try:
                price = float(str(price_raw).replace(',', '').replace('₹', '').strip())
            except (ValueError, TypeError):
                errors.append(f"Row {idx + 2}: Invalid price '{price_raw}'")
                continue
            
            # Parse quantity
            qty_raw = row[quantity_col]
            try:
                quantity = float(str(qty_raw).replace(',', '').strip())
            except (ValueError, TypeError):
                errors.append(f"Row {idx + 2}: Invalid quantity '{qty_raw}'")
                continue
            
            # Get name if available
            name = ""
            if name_col and pd.notna(row.get(name_col)):
                name = str(row[name_col]).strip()
            
            # Skip rows with zero quantity
            if quantity <= 0:
                continue
            
            holdings.append({
                'ticker': ticker,
                'name': name or ticker,
                'avg_buy_price': round(price, 2),
                'quantity': round(quantity, 4),
                'row_number': idx + 2  # Excel-style 1-indexed + header
            })
        
        except Exception as e:
            errors.append(f"Row {idx + 2}: {str(e)}")
    
    if not holdings:
        raise ImportError(
            f"No valid holdings found in file. "
            f"Errors: {'; '.join(errors[:5])}"
        )
    
    metadata = {
        'detected_broker': detected_broker,
        'column_mappings': {
            'ticker': ticker_col,
            'price': price_col,
            'quantity': quantity_col,
            'name': name_col
        },
        'available_columns': list(df.columns),
        'total_rows': len(df),
        'valid_holdings': len(holdings),
        'errors': errors[:10],  # Limit errors
        'imported_at': datetime.utcnow().isoformat()
    }
    
    return holdings, metadata


def preview_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Get a preview of the file for user confirmation.
    
    Returns:
        Dict with sample data, detected columns, and mappings
    """
    df = parse_file(file_content, filename)
    
    # Get first 5 rows as sample
    sample_data = df.head(5).to_dict(orient='records')
    
    # Detect columns
    detected = {
        'ticker': _find_column(df, TICKER_PATTERNS),
        'price': _find_column(df, PRICE_PATTERNS),
        'quantity': _find_column(df, QUANTITY_PATTERNS),
        'name': _find_column(df, NAME_PATTERNS)
    }
    
    return {
        'columns': list(df.columns),
        'sample_data': sample_data,
        'detected_mappings': detected,
        'detected_broker': _detect_broker(df),
        'total_rows': len(df)
    }
