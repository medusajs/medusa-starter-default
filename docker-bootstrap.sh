# command: sh -c "npx medusa db:setup --db ${POSTGRES_DB:-mesera} && npx medusa user -e ${PROJECT_ADMIN_EMAIL:-eumeadi@gmail.com} -p ${PROJECT_ADMIN_PASSWORD:-chigozie} && yarn ${PROJECT_RUN_MODE:-start}"
CONTAINER_ALREADY_STARTED="CONTAINER_ALREADY_STARTED_PLACEHOLDER"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    touch $CONTAINER_ALREADY_STARTED
    # YOUR_JUST_ONCE_LOGIC_HERE
    echo "-- First container startup --"
    echo "-- Running medusa db setup... --"
	npx medusa db:setup --db ${POSTGRES_DB:-mesera} 
	
	if [ $PROJECT_RUN_MODE == "dev" ]; then
		echo "-- Adding test data... --"
		yarn seed
		npx medusa user -e ${PROJECT_ADMIN_EMAIL:-eumeadi@gmail.com} -p ${PROJECT_ADMIN_PASSWORD:-medusa123}
		echo "-- ...finished adding test data --"
	fi
    echo "-- ...finished running db setup --"
	
else
	echo "-- Not first container startup --"

fi

echo "-- Now starting application... --"
yarn "${PROJECT_RUN_MODE:-start}"