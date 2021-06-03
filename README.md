# Medusa Starter Default

This repo provides the skeleton to get you started with using Medusa. Follow the steps below to get ready.

## Prerequisites
- Have Postgresql installed and ensure it is running and initialized.
    - `brew install postgresql`
    - `brew services start postgresql`
    - `createdb`

- Install Redis and ensure that it is running.
    - `brew install redis`
    - `brew services start redis`

- Have Yarn and related packages installed globally:
    - Install yarn if needed `brew install yarn` 
    - Install packages `yarn global add npm @babel/core`


## Running Medusa
- Copy the `.env.template` file to a `.env` file in the root directory
- Setup a Stripe account and add your API key and webhook secret to your `.env`
- Setup a Sendgrid account and add your API key to your `.env`
- Install all dependencies `$ yarn`
- Create a local postgres database using `$ psql -h localhost -c 'create database "medusa-development";'`
- Migrate and seed the database `$ yarn seed`
- Run `$ medusa develop`

Your local Medusa server is now running on port 9000. 

Visit [docs.medusa-commerce.com](https://docs.medusa-comerce.com) for further guides.

