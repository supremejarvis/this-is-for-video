"""Spreadsheet formula-injection defense and secure CSV/Excel processing."""
import csv
import io
import re
from typing import Any, Sequence

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_cell_value(val: Any) -> str:
    """Sanitize a cell value to prevent CSV / Spreadsheet formula injection (OWASP guideline).
    
    If the text starts with dangerous characters (=, +, -, @, \\t, \\r),
    prepend a single quote (') so spreadsheet applications interpret it strictly as text.
    """
    if val is None:
        return ""
    raw = str(val)
    if raw.startswith(DANGEROUS_PREFIXES) or raw.strip().startswith(DANGEROUS_PREFIXES):
        return f"'{raw}"
    return raw.strip()



def generate_safe_csv(headers: Sequence[str], rows: Sequence[Sequence[Any]]) -> str:
    """Generate a CSV string with all cell values sanitized against formula injection."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # Write sanitized headers
    writer.writerow([sanitize_cell_value(h) for h in headers])
    
    # Write sanitized data rows
    for row in rows:
        writer.writerow([sanitize_cell_value(cell) for cell in row])
        
    return output.getvalue()


def parse_csv_rows(content: str) -> tuple[list[str], list[dict[str, str]], list[str]]:
    """Parse CSV text, extract headers, and return rows as dictionaries with row error reporting.
    
    Returns:
        (headers, valid_rows, parse_errors)
    """
    lines = content.strip().splitlines()
    if not lines:
        return [], [], ["CSV content is empty."]

    reader = csv.reader(lines)
    try:
        raw_headers = next(reader)
    except StopIteration:
        return [], [], ["CSV header row missing."]

    headers = [h.strip() for h in raw_headers if h.strip()]
    if not headers:
        return [], [], ["No valid column headers found."]

    valid_rows: list[dict[str, str]] = []
    errors: list[str] = []

    for row_idx, row in enumerate(reader, start=2):
        if not row or all(not cell.strip() for cell in row):
            continue  # skip empty lines
        if len(row) < len(headers):
            errors.append(f"Row {row_idx}: Expected {len(headers)} columns, got {len(row)}.")
            continue
        
        row_dict: dict[str, str] = {}
        for idx, header in enumerate(headers):
            cell_val = row[idx].strip()
            # If user had prepended single quote to escape formula, strip leading quote safely
            if cell_val.startswith("'") and len(cell_val) > 1 and cell_val[1] in DANGEROUS_PREFIXES:
                cell_val = cell_val[1:]
            row_dict[header] = cell_val
        valid_rows.append(row_dict)

    return headers, valid_rows, errors
