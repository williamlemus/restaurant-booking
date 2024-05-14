# Restaurant Booking

The project has the following endpoints

```
GET /reservation/search - find available restaurants by users and time
POST /reservation - make reservation with group of people
DELETE /reservation/:id - delete reservation
```

The required data for each endpoint is as follows:

### GET /reservation/search

- query params:
  - time: datetime you are looking for
  - user_ids: an array with all the users that would like to be part of a reservation
- Response:
  - `message`: This will appear whenever there is an issue with the request
    - The user is searching for availability in the past
    - There are missing query params
  - Body:
    - An array of restuarants that can be reserved by the users. Each object inside the array(which is one resturant), will have the following:
      - `id`: id of restaurant
      - `name`: name of restaurant
      - `endorsements`: array of objects containing the id, endorsement_name, and restriction_name
      - `tables`: array of objects, with each object being a table id, capacity and restaurant_id

### POST /reservation

- Body:
  - `time`: datetime you want to reserve
  - `user_ids`: an array with all the users that would be part of a reservation
  - `restaurant_id`: the id of the restaurant
- Response:
  - An error `message` will be returned if:
    - There is an invalid user
    - Any body param is missing
    - There is no availability
    - The restuarant does not have an endorsement required by any user
    - Any user already has a reservation at any restaurant during a 2-hour time window.
  - When a reservation is successfully created, the body will be the reservation:
    - `id`: id of the reservation
    - `startTime`: time of the reservation
    - `endTime`: end time of the reservation
    - `restaurantId`: id of restaurant
    - `tableId`: id of the assigned table on the reservation

### DELETE /reservation/:id

- Body:
  - `user_id`: The id of one of the users on the reservation
- Response:
  - If the user is not on the reservation or the reservation does not exists, a 404 with reservation not found is returned
  - Body will be the deleted reservation:
    - `id`: id of the reservation
    - `startTime`: time of the reservation
    - `endTime`: end time of the reservation
    - `restaurantId`: id of restaurant
    - `tableId`: id of the assigned table on the reservation

### To run locally:

- `npm install`
- run the seed script:
  `npm run prisma seed`

There are also some tests that can be run by calling `npm test`
