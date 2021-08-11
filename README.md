# `medusa-starter-sqlite`

This repo provides the skeleton to get you started with using Medusa. Follow the steps below to get ready.

## Prerequisites
This starter has minimal prerequisites and most of these will usually already be installed on your computer.

- [Install Node.js](https://nodejs.org/en/download/)
- [Install git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Install SQLite](https://www.sqlite.org/download.html)

## Setting up your store
- Install the Medusa CLI
  ```
  npm install -g @medusajs/medusa
  yarn global add @medusajs/medusa
  ```
- Create a new Medusa project
  ```
  medusa new medusa-sqlite https://github.com/medusajs/medusa-starter-sqlite
  ```
- Run your project
  ```
  cd medusa-sqlite
  medusa develop
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

