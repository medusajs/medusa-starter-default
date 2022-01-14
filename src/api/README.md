# Custom endpoints

# Usage

##Api

### Admin routes
Those routes will automatically be attached by medusa to the admin path.

### Store routes
Those routes will automatically be attached by medusa to the store path.

###Custom routes
All those routes are added in the main router and you have to manage them.

## Info
A global container is available on `req.scope` to allow you to use any of the registered services from the core, installed plugins or your local project: