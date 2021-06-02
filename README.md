# Medusa Starter Default

This repo provides the skeleton to get you started with using Medusa. Follow the steps below to get ready.

- Copy the `.env.template` file to a `.env` file in the root directory
- Setup a Stripe account and add your API key and webhook secret to your `.env`
- Setup a Sendgrid account and add your API key to your `.env`
- `yarn`
- Make sure yarn has added npm and babel/core globally `yarn global add npm` and `yarn global add @babel/core`
- Make sure redis and postgresql is running using `brew services start postgres` and `brew services start redis`
- Make sure postgresql is running (and initialized) by using `createdb`
- Create a local postgres database using `psql -h localhost -c 'create database "medusa-development";'`
- Migrate the database `medusa migrations run`
- Run `medusa develop`



Your local Medusa server is now running on port 9000. 

Visit docs.medusa-commerce.com for further guides.

