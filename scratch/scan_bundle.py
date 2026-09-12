import os
import re
import sys

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")

def scan_dist():
    if not os.path.exists(DIST_DIR):
        print("FAIL: dist directory does not exist", flush=True)
        return False

    secret_key_names = [
        "RAZORPAY_KEY_SECRET",
        "MSG91_AUTH_KEY",
        "CEPT_PASSWORD",
        "DATABASE_URL",
        "JWT_SECRET",
    ]

    admin_credentials_and_flags = [
        "apollo_admin_auth",
        "Admin@123",
        "Pravin@123",
        "Apollo@123",
    ]

    otp_backdoor_strings = [
        '"1234"',
        "'1234'",
        '"6029"',
        "'6029'",
        "codGeneratedOtp",
    ]

    known_phone_numbers = [
        "9825012345",
        "9876543210",
    ]

    failures = []

    for root, _, files in os.walk(DIST_DIR):
        for f in files:
            if not (f.endswith(".js") or f.endswith(".html") or f.endswith(".css")):
                continue
            file_path = os.path.join(root, f)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
            except Exception as e:
                continue

            # 1. Secret keys
            for secret_key in secret_key_names:
                if secret_key in content:
                    failures.append(f"Secret variable found in {f}")

            # 2. Admin credentials / flags
            for cred in admin_credentials_and_flags:
                if cred in content:
                    failures.append(f"Admin credential/flag found in {f}")

            # 3. OTP backdoor strings
            # Check specifically if backdoor OTP comparison or variable remains
            if "codGeneratedOtp" in content:
                failures.append(f"OTP backdoor found in {f}")
            if ('"1234"' in content or "'1234'" in content) and "otp" in content.lower():
                # Let's check if 1234 is used near otp
                matches = [m.start() for m in re.finditer(r'["\']1234["\']', content)]
                for m in matches:
                    snippet = content[max(0, m - 50):min(len(content), m + 50)]
                    if "otp" in snippet.lower():
                        failures.append(f"OTP backdoor found in {f}")

            # 4. Complete customer phone numbers
            for phone in known_phone_numbers:
                if phone in content:
                    failures.append(f"Customer phone number found in {f}")

    if failures:
        print("FAIL", flush=True)
        # Note: Do not print matching secrets, only the category
        unique_cats = sorted(list(set(failures)))
        for cat in unique_cats:
            print(f"  - {cat}", flush=True)
        return False
    else:
        print("PASS", flush=True)
        return True

if __name__ == "__main__":
    success = scan_dist()
    sys.exit(0 if success else 1)
