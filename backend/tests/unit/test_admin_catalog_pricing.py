"""Unit tests for enterprise catalog taxonomy, variant Cartesian keys, spreadsheet security, and pricing invariants."""
import uuid
from decimal import Decimal
import pytest

from app.core.spreadsheet_security import generate_safe_csv, sanitize_cell_value, parse_csv_rows
from app.services.variant_generation_service import compute_canonical_combination_key
from app.services.category_service import CycleDetectedException


def test_spreadsheet_security_formula_injection():
    """Verify OWASP formula injection characters are escaped by prepending single-quote."""
    dangerous = [
        "=cmd|' /C calc'!A0",
        "+12345",
        "-5000",
        "@SUM(A1:A10)",
        "\tmalicious_tab",
        "\rmalicious_cr",
    ]
    for d in dangerous:
        sanitized = sanitize_cell_value(d)
        assert sanitized.startswith("'"), f"Dangerous input '{d}' was not escaped with leading quote: '{sanitized}'"

    # Benign text and numbers should not have extra quote
    assert sanitize_cell_value("SS304 Drain Clip") == "SS304 Drain Clip"
    assert sanitize_cell_value("APE-SC-30MM") == "APE-SC-30MM"
    assert sanitize_cell_value(42) == "42"


def test_safe_csv_generation():
    """Verify CSV generator outputs sanitized cells."""
    headers = ["SKU", "Description", "Price"]
    rows = [
        ["APE-SC-28", "Safe product", "20.00"],
        ["=INJECT", "@FORMULA", "+99.99"],
    ]
    csv_text = generate_safe_csv(headers, rows)
    assert "'=INJECT" in csv_text
    assert "'@FORMULA" in csv_text
    assert "'+99.99" in csv_text
    assert "Safe product" in csv_text


def test_canonical_combination_key_ordering_invariance():
    """Verify that changing the order of variant axes does NOT alter the canonical combination key."""
    attr_a = uuid.uuid4()
    attr_b = uuid.uuid4()
    val_1 = uuid.uuid4()
    val_2 = uuid.uuid4()

    # Order 1: Axis A then Axis B
    key_order_1 = compute_canonical_combination_key([(attr_a, val_1), (attr_b, val_2)])
    # Order 2: Axis B then Axis A
    key_order_2 = compute_canonical_combination_key([(attr_b, val_2), (attr_a, val_1)])

    assert key_order_1 == key_order_2, "Canonical combination key must be strictly invariant to axis order"


def test_parse_csv_rows_with_error_reporting():
    """Verify CSV parser correctly detects missing headers, empty rows, and malformed rows."""
    valid_csv = "SKU,Pack Size\nAPE-SC-28,50\nAPE-SC-30,100"
    headers, rows, errors = parse_csv_rows(valid_csv)
    assert headers == ["SKU", "Pack Size"]
    assert len(rows) == 2
    assert len(errors) == 0

    malformed_csv = "SKU,Pack Size\nAPE-SC-28\nAPE-SC-30,100"
    headers, rows, errors = parse_csv_rows(malformed_csv)
    assert len(rows) == 1
    assert len(errors) == 1
    assert "Row 2: Expected 2 columns, got 1" in errors[0]
