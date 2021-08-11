# Medusa Starter Default

This repo provides the skeleton to get you started with using Medusa. Follow the steps below to get ready.

## Prerequisites
- Have Postgresql installed and ensure it is running and initialized.
    - `$ brew install postgresql`
    - `$ brew services start postgresql`
    - `$ createdb`

- Install Redis and ensure that it is running.
    - `$ brew install redis`
    - `$ brew services start redis`

- Have Yarn and related packages installed globally:
    - Install yarn if needed `$ brew install yarn` 
    - Install packages `$ yarn global add npm @babel/core`


## Running Medusa
- Get your environment variables ready: 
  ```
  $ mv .env.template .env
  ```
- Install all dependencies 
  ```
  $ yarn
  ```
- Create a local postgres database using 
  ```
  $ psql -h localhost -c 'create database "medusa-development";'
  ```
- Migrate and seed the database 
  ```
  $ yarn seed
  ```
- Start the Medusa server:
  ```
  $ medusa develop
  ```

Your local Medusa server is now running on port **9000**. 

## Try it out

```
curl -X GET localhost:9000/store/products | python -m json.tool
```

After the seed script has run you will have the following things in you database:

- a User with the email: admin@medusa-test.com and password: supersecret
- a Region called Default Region with the countries GB, DE, DK, SE, FR, ES, IT
- a Shipping Option called Standard Shipping which costs 10 EUR
- a Product called Cool Test Product with 4 Product Variants that all cost 19.50 EUR


Visit [docs.medusa-commerce.com](https://docs.medusa-comerce.com) for further guides.

