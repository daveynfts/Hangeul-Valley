import html.parser
import re
import sys

class CSSVerifier:
    def __init__(self, css_text):
        self.css_text = css_text
        self.errors = []
        self.warnings = []

    def verify(self):
        # 1. Comment balancing
        open_comments = self.css_text.count("/*")
        close_comments = self.css_text.count("*/")
        if open_comments != close_comments:
            self.errors.append(f"Comment mismatch: {open_comments} '/*' vs {close_comments} '*/'")

        # Strip comments for structure analysis
        clean_css = re.sub(r'/\*[\s\S]*?\*/', '', self.css_text)

        # 2. Curly brace balancing
        open_braces = clean_css.count("{")
        close_braces = clean_css.count("}")
        if open_braces != close_braces:
            self.errors.append(f"Brace count mismatch: {open_braces} '{{' vs {close_braces} '}}'")

        # Detailed line-by-line bracket tracking
        stack = []
        lines = self.css_text.splitlines()
        in_comment = False

        for line_num, line in enumerate(lines, 1):
            i = 0
            while i < len(line):
                if not in_comment and line[i:i+2] == "/*":
                    in_comment = True
                    i += 2
                    continue
                elif in_comment and line[i:i+2] == "*/":
                    in_comment = False
                    i += 2
                    continue
                elif in_comment:
                    i += 1
                    continue

                ch = line[i]
                if ch == '{':
                    stack.append((line_num, i+1))
                elif ch == '}':
                    if not stack:
                        self.errors.append(f"Line {line_num}:{i+1} - Unexpected closing brace '}}'")
                    else:
                        stack.pop()
                i += 1

        if stack:
            for lnum, col in stack:
                self.errors.append(f"Line {lnum}:{col} - Unclosed brace '{{'")

        # 3. Check CSS selector syntax & property declarations
        # Extract rule blocks
        rule_pattern = re.compile(r'([^{}]+)\{([^{}]*)\}')
        rules = rule_pattern.findall(clean_css)

        for selector, declaration_block in rules:
            selector = selector.strip()
            # Ignore keyframes steps (e.g. 0%, 100%, from, to) and @keyframes/@media
            if selector.startswith('@keyframes') or selector.startswith('@media') or selector in ['from', 'to'] or selector.endswith('%'):
                continue

            # Check declarations inside block
            declarations = [d.strip() for d in declaration_block.split(';') if d.strip()]
            for decl in declarations:
                if decl.startswith('@') or decl.startswith('/*'):
                    continue
                if ':' not in decl:
                    self.warnings.append(f"Malformed CSS declaration in selector '{selector}': '{decl}' (missing colon)")
                else:
                    prop, val = decl.split(':', 1)
                    prop = prop.strip()
                    val = val.strip()
                    if not prop:
                        self.errors.append(f"Empty property name in selector '{selector}': '{decl}'")

        # 4. Check Glassmorphic properties
        has_backdrop_filter = "backdrop-filter:" in clean_css
        has_webkit_backdrop = "-webkit-backdrop-filter:" in clean_css
        print(f"CSS Glassmorphic feature check: backdrop-filter={has_backdrop_filter}, -webkit-backdrop-filter={has_webkit_backdrop}")

        return len(self.errors) == 0

def extract_and_verify_html_css(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Extract all <style> contents
    styles = re.findall(r'<style[^>]*>([\s\S]*?)</style>', html_content, re.IGNORECASE)
    print(f"Found {len(styles)} <style> tag(s) in {html_path}.")

    all_passed = True
    for idx, css_text in enumerate(styles, 1):
        print(f"\n--- Checking <style> Block #{idx} (Length: {len(css_text)} chars) ---")
        verifier = CSSVerifier(css_text)
        success = verifier.verify()
        if verifier.errors:
            print(f"[FAIL] {len(verifier.errors)} CSS error(s) found:")
            for err in verifier.errors[:15]:
                print(f"  - {err}")
            all_passed = False
        else:
            print("[PASS] CSS syntax and brace balancing verified!")

        if verifier.warnings:
            print(f"[WARNING] {len(verifier.warnings)} CSS warning(s):")
            for w in verifier.warnings[:10]:
                print(f"  - {w}")

    return all_passed

if __name__ == "__main__":
    success = extract_and_verify_html_css(r"C:\VibeCode\Hangeul Valley\index.html")
    sys.exit(0 if success else 1)
