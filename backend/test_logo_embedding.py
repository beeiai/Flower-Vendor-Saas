"""
Test script to verify logo embedding in print templates

This script tests that the logo is properly converted to base64 and embedded in HTML.
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_logo_file_exists():
    """Test that the logo file exists"""
    print("Testing logo file existence...")
    # Use absolute path from current file location
    logo_path = Path(__file__).parent / "templates" / "SKFS_logo.png"
    
    if not logo_path.exists():
        print(f"❌ Logo file NOT found at: {logo_path}")
        # Try alternative path
        alt_path = Path.cwd() / "templates" / "SKFS_logo.png"
        print(f"   Trying alternative: {alt_path}")
        if alt_path.exists():
            print(f"✅ Found at alternative path: {alt_path}")
            return True
        return False
    
    print(f"✅ Logo file found at: {logo_path}")
    print(f"   File size: {logo_path.stat().st_size} bytes")
    return True

def test_base64_conversion():
    """Test that logo can be converted to base64"""
    print("\nTesting base64 conversion...")
    try:
        import base64
        
        logo_path = Path(__file__).parent / "templates" / "SKFS_logo.png"
        
        with open(logo_path, 'rb') as img_file:
            img_bytes = img_file.read()
            img_data = base64.b64encode(img_bytes).decode('utf-8')
            data_uri = f'data:image/png;base64,{img_data}'
        
        print(f"✅ Successfully converted logo to base64")
        print(f"   Data URI length: {len(data_uri)} characters")
        print(f"   Data URI prefix: {data_uri[:50]}...")
        return True
        
    except Exception as e:
        print(f"❌ Base64 conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_html_replacement():
    """Test that logo references are replaced in HTML"""
    print("\nTesting HTML replacement logic...")
    try:
        import base64
        
        # Sample HTML with logo references
        test_html = """
        <html>
        <head><title>Test</title></head>
        <body>
            <img src="/static/images/SKFS_logo.png" alt="Logo">
            <img src="SKFS_logo.png" alt="Logo">
            <img src='/static/images/SKFS_logo.png' alt="Logo">
            <div>Some content</div>
        </body>
        </html>
        """
        
        # Convert logo to base64
        logo_path = Path(__file__).parent / "templates" / "SKFS_logo.png"
        with open(logo_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
            data_uri = f'data:image/png;base64,{img_data}'
        
        # Apply replacements (same as in docx_print_templates.py)
        html_content = test_html
        replacements = [
            ('src="/static/images/SKFS_logo.png"', f'src="{data_uri}"'),
            ('src="SKFS_logo.png"', f'src="{data_uri}"'),
            ("src='/static/images/SKFS_logo.png'", f'src="{data_uri}"'),
            ("src='SKFS_logo.png'", f'src="{data_uri}"'),
            ('href="/static/images/SKFS_logo.png"', f'href="{data_uri}"'),
            ('href="SKFS_logo.png"', f'href="{data_uri}"'),
        ]
        
        replaced_count = 0
        for old, new in replacements:
            count = html_content.count(old)
            if count > 0:
                html_content = html_content.replace(old, new)
                replaced_count += count
                print(f"   Replaced {count} occurrence(s): {old[:40]}")
        
        # Verify all references were replaced
        remaining_old = (
            html_content.count('src="/static/images/SKFS_logo.png"') +
            html_content.count('src="SKFS_logo.png"') +
            html_content.count("src='/static/images/SKFS_logo.png'") +
            html_content.count("src='SKFS_logo.png'")
        )
        
        if remaining_old == 0 and replaced_count > 0:
            print(f"✅ All logo references successfully replaced ({replaced_count} total)")
            return True
        elif replaced_count == 0:
            print("⚠️  No logo references found to replace")
            return False
        else:
            print(f"❌ {remaining_old} logo references NOT replaced")
            return False
            
    except Exception as e:
        print(f"❌ HTML replacement test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_template_files():
    """Test that template files have logo references"""
    print("\nTesting template files for logo references...")
    
    templates_dir = Path(__file__).parent / "templates"
    templates = [
        "ledger_report.html",
        "group_patti_report.html",
        "group_total_report.html",
        "daily_sales_report.html"
    ]
    
    results = []
    for template_name in templates:
        template_path = templates_dir / template_name
        
        if not template_path.exists():
            print(f"   ❌ Template not found: {template_name}")
            results.append(False)
            continue
        
        content = template_path.read_text()
        has_logo_ref = (
            'src="/static/images/SKFS_logo.png"' in content or
            'src="SKFS_logo.png"' in content
        )
        
        if has_logo_ref:
            print(f"   ✅ {template_name}: Has logo reference")
            results.append(True)
        else:
            print(f"   ⚠️  {template_name}: No logo reference found")
            results.append(False)
    
    passed = sum(results)
    total = len(results)
    print(f"\nTemplate check: {passed}/{total} templates have logo references")
    return passed == total

def main():
    """Run all tests"""
    print("=" * 70)
    print("LOGO EMBEDDING VERIFICATION TESTS")
    print("=" * 70)
    print()
    
    tests = [
        ("Logo File Existence", test_logo_file_exists),
        ("Base64 Conversion", test_base64_conversion),
        ("HTML Replacement Logic", test_html_replacement),
        ("Template Files Check", test_template_files)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        icon = "✅" if result else "❌"
        print(f"{icon} {name}")
    
    print(f"\nResults: {passed}/{total} tests passed\n")
    
    if passed == total:
        print("🎉 All tests passed! Logo embedding should work correctly.")
        print("\nNext steps:")
        print("1. Deploy updated backend code")
        print("2. Test print functionality in the application")
        print("3. Verify logo appears in all 4 report types")
        return 0
    else:
        print("❌ Some tests failed. Please review errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
