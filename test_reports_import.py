#!/usr/bin/env python
"""Quick test to check if reports system loads without errors."""

import sys
sys.path.insert(0, 'backend')

try:
    print("Testing imports...")
    from app.routes import reports
    print("✅ Reports module loaded successfully")
    
    from app.utils import reports_db
    print("✅ Reports_db module loaded successfully")
    
    from app.utils import page_counter
    print("✅ Page counter module loaded successfully")
    
    print("\n✅ All modules imported successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
