import sys
sys.path.insert(0, 'backend')

try:
    from app.routes.reports import router
    
    print("=" * 60)
    print("REPORTS ROUTER - All Routes")
    print("=" * 60)
    
    daily_routes = [route for route in router.routes if hasattr(route, 'path') and 'daily' in route.path.lower()]
    
    print(f"\nFound {len(daily_routes)} daily-sales related routes:")
    for route in daily_routes:
        methods = getattr(route, 'methods', ['GET'])
        path = route.path
        name = getattr(route, 'name', 'Unknown')
        print(f"  {list(methods)[0]:6} {path:40} ({name})")
    
    print("\n" + "=" * 60)
    print(f"Total routes in reports router: {len(router.routes)}")
    print("=" * 60)
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
