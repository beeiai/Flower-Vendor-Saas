from importlib import import_module
m = import_module('app.main')
app = m.app
print('CORS middleware options:')
for mw in app.user_middleware:
    if mw.cls.__name__.endswith('CORSMiddleware') or 'cors' in str(mw.cls).lower():
        print(mw.options)
        break
else:
    print('No CORS middleware found')
