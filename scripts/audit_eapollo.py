import os
import re
import json

ROOT = r"C:\Users\patel\OneDrive\Desktop\eapollo"

def analyze_workspace():
    results = {
        "services": {},
        "workers": {},
        "database": {},
        "gateway": {},
        "infrastructure": {},
        "packages": {},
        "todos": [],
        "pass_statements": [],
        "not_implemented": [],
        "mock_mentions": [],
        "schemas": [],
        "kafka_mentions": [],
        "sqs_mentions": [],
    }

    # 1. Inspect services
    services_dir = os.path.join(ROOT, "services")
    if os.path.exists(services_dir):
        for s in os.listdir(services_dir):
            s_path = os.path.join(services_dir, s)
            if os.path.isdir(s_path):
                files = []
                py_files = []
                for r, d, f_list in os.walk(s_path):
                    for f in f_list:
                        rel = os.path.relpath(os.path.join(r, f), s_path)
                        files.append(rel)
                        if f.endswith('.py'):
                            py_files.append(os.path.join(r, f))
                
                # Check for skeleton vs complete
                endpoints = []
                models = []
                has_routes = False
                total_lines = 0
                for pyf in py_files:
                    try:
                        with open(pyf, 'r', encoding='utf-8', errors='ignore') as fp:
                            content = fp.read()
                            lines = content.splitlines()
                            total_lines += len(lines)
                            for match in re.finditer(r'@router\.(get|post|put|delete|patch)\(([^)]+)\)', content):
                                endpoints.append(f"{match.group(1).upper()} {match.group(2)[:30]}")
                    except Exception as e:
                        pass

                results["services"][s] = {
                    "file_count": len(files),
                    "py_file_count": len(py_files),
                    "total_lines": total_lines,
                    "sample_endpoints": endpoints[:10],
                    "total_endpoints": len(endpoints),
                    "files": files[:15]
                }

    # 2. Inspect workers
    workers_dir = os.path.join(ROOT, "workers")
    if os.path.exists(workers_dir):
        for w in os.listdir(workers_dir):
            w_path = os.path.join(workers_dir, w)
            if os.path.isdir(w_path):
                files = []
                py_files = []
                for r, _dirs, f_list in os.walk(w_path):
                    for f in f_list:
                        files.append(os.path.relpath(os.path.join(r, f), w_path))
                        if f.endswith('.py'):
                            py_files.append(os.path.join(r, f))
                results["workers"][w] = {
                    "file_count": len(files),
                    "py_file_count": len(py_files),
                    "files": files
                }

    # 3. Database schemas
    db_dir = os.path.join(ROOT, "database")
    if os.path.exists(db_dir):
        for r, _dirs, f_list in os.walk(db_dir):
            for f in f_list:
                results["schemas"].append(os.path.relpath(os.path.join(r, f), db_dir))

    # 4. Search patterns
    for r, _dirs, f_list in os.walk(ROOT):
        if any(ignored in r for ignored in [".git", "node_modules", ".venv", "__pycache__"]):
            continue
        for f in f_list:
            if not f.endswith(('.py', '.ts', '.tsx', '.yml', '.yaml', '.tf', '.sql')):
                continue
            fpath = os.path.join(r, f)
            relpath = os.path.relpath(fpath, ROOT)
            try:
                with open(fpath, encoding='utf-8', errors='ignore') as fp:
                    for lno, line in enumerate(fp, 1):
                        stripped_line = line.strip()
                        if 'TODO' in stripped_line or 'FIXME' in stripped_line:
                            results["todos"].append({"file": relpath, "line": lno, "text": stripped_line[:120]})
                        if 'NotImplementedError' in stripped_line:
                            results["not_implemented"].append({"file": relpath, "line": lno, "text": stripped_line[:120]})
                        if re.match(r'^\s*pass\s*$', stripped_line):
                            results["pass_statements"].append({"file": relpath, "line": lno})
                        if 'mock' in stripped_line.lower() and not relpath.startswith('tests'):
                            results["mock_mentions"].append({"file": relpath, "line": lno, "text": stripped_line[:120]})
                        if 'kafka' in stripped_line.lower() and not f.endswith('.md'):
                            results["kafka_mentions"].append({"file": relpath, "line": lno, "text": stripped_line[:120]})
                        if ('sqs' in stripped_line.lower() or 'sns' in stripped_line.lower()) and not f.endswith('.md'):
                            results["sqs_mentions"].append({"file": relpath, "line": lno, "text": stripped_line[:120]})
            except Exception:
                pass

    print(f"Total TODOs: {len(results['todos'])}")
    print(f"Total NotImplementedError: {len(results['not_implemented'])}")
    print(f"Total pass statements: {len(results['pass_statements'])}")
    print(f"Services found: {list(results['services'].keys())}")
    print(f"Workers found: {list(results['workers'].keys())}")
    print(f"Schemas found: {results['schemas']}")

    with open(r"C:\Users\patel\.gemini\antigravity-ide\brain\bc107736-4363-455a-a32b-dbbaff475427\scratch\eapollo_audit_raw.json", "w", encoding="utf-8") as out:
        json.dump(results, out, indent=2)

if __name__ == "__main__":
    os.makedirs(r"C:\Users\patel\.gemini\antigravity-ide\brain\bc107736-4363-455a-a32b-dbbaff475427\scratch", exist_ok=True)
    analyze_workspace()
