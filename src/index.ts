import { PrismaClient, Reservation } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import express, { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
const RESERVATION_LENGTH_IN_HOURS = 2;

class CustomError extends Error {
  public statusCode: number;
  public message: string;
  constructor(status: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
    this.statusCode = status;
    this.message = message;
  }
}

const calculateTimeRange = (
  time: Date,
  offset = RESERVATION_LENGTH_IN_HOURS
) => {
  return [
    new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      time.getHours() - offset,
      time.getMinutes()
    ),
    new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      time.getHours() + offset,
      time.getMinutes()
    ),
  ];
};

app.post(`/reservation`, async (req, res, next) => {
  const { user_ids, time, restaurant_id } = req.body;

  const startTime = new Date(time);
  try {
    // add validations/errors for each field
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: user_ids as string[],
        },
      },
      select: {
        name: true,
        restrictions: {
          select: { id: true },
        },
      },
    });
    const restriction_ids = users
      .map((user) => user.restrictions.map((restriction) => restriction.id))
      .flat();
    const endorsements = (
      await prisma.endorsement.findMany({
        where: { id: restaurant_id },
        select: { id: true },
      })
    ).map((elem) => elem.id);
    if (
      !restriction_ids.every((restriction) =>
        endorsements.includes(restriction)
      )
    ) {
      return res.json("Restaurant does not accomodate dietary preferences");
    }

    // Check no one has taken up the time
    const [lowerBound, upperBound] = calculateTimeRange(startTime);
    const currentReservations = await prisma.reservation.findMany({
      where: {
        startTime: {
          gt: lowerBound,
          lte: upperBound,
        },
        restaurantId: restaurant_id,
      },
    });
    const userReservations = await prisma.reservation.findMany({
      where: {
        startTime: {
          gt: lowerBound,
          lte: upperBound,
        },
        restaurantId: restaurant_id,
        users: {
          some: {
            id: { in: user_ids as string[] },
          },
        },
      },
    });
    // if one of them has a reservation, do not let them book!
    if (userReservations.length > 0) {
      return res.json("Someone in your party already has a reservation!");
    }
    // get free tables(tables not in the above reservations that have capacity gte user_ids)
    const freeTables = await prisma.table.findMany({
      where: {
        NOT: {
          id: {
            in: currentReservations.map((reservation) => reservation.tableId),
          },
        },
        capacity: {
          gte: user_ids.length as number,
        },
      },
    });

    if (freeTables.length === 0) {
      return res.json("No tables are available! Please try another time");
    }

    const tableId = freeTables[0].id;
    console.log(user_ids.map((user_id: string) => ({ id: user_id })));
    const result = await prisma.reservation.create({
      data: {
        restaurantId: restaurant_id as string,
        users: {
          connect: user_ids.map((user_id: string) => ({ id: user_id })),
        },
        startTime,
        endTime: new Date(
          startTime.getFullYear(),
          startTime.getMonth(),
          startTime.getDate(),
          startTime.getHours() + RESERVATION_LENGTH_IN_HOURS,
          startTime.getMinutes()
        ),
        tableId,
      },
    });
    res.json(result);
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      console.error(err.message, err.meta);
    }
    next(new CustomError(400, "Sorry, couldn't make a new reservation"));
  }
});

app.get(
  "/reservation/search",
  async (req: Request<{ user_ids: string[]; time: string }>, res) => {
    const { user_ids = [], time } = req.query;
    const startTime = typeof time === "string" ? new Date(time) : new Date();
    // don't send anything if date is in the past
    if (new Date() > startTime) {
      return res
        .status(400)
        .send({ message: "Cannot make reservation in the past!" });
    }
    // also handle when invalid users are sent(either return nothing or just let it return all)
    const [lowerBound, upperBound] = calculateTimeRange(startTime);
    const reservations = await prisma.reservation.findMany({
      where: {
        startTime: {
          gt: lowerBound,
          lte: upperBound,
        },
      },
      select: {
        restaurantId: true,
        users: {
          where: {
            id:
              // fix this
              { in: user_ids as string[] },
          },
        },
        tableId: true,
        startTime: true,
      },
    });

    const endorsements = await prisma.endorsement.findMany({
      where: { users: { some: { id: { in: user_ids as string[] } } } },
      select: {
        id: true,
        endorsement_name: true,
        users: {
          select: {
            name: true,
          },
        },
      },
    });

    const availableRestaurants = await prisma.restaurant.findMany({
      where: {
        NOT: {
          id: {
            in: reservations.map((reservation) => reservation.restaurantId),
          },
        },
        AND: endorsements.map((endorsement) => ({
          endorsements: { some: { id: endorsement.id } },
        })),
        tables: {
          none: {
            id: {
              in: reservations.map((reservation) => reservation.tableId),
            },
          },
          some: {},
        },
      },
      select: {
        endorsements: true,
        id: true,
        name: true,
        tables: {
          where: {
            capacity: {
              gte: user_ids.length as number,
            },
          },
        },
      },
    });
    // for now, filter table here
    res.json(
      availableRestaurants.map((restaurant) => ({
        ...restaurant,
        tables: restaurant.tables.filter(
          (table) => table.capacity >= (user_ids.length as number)
        ),
      }))
    );
  }
);

app.delete(`/reservation/:id`, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  let reservation: Reservation | Record<never, object> = {};
  // check that user is part of reservation before deleting
  if (
    await prisma.reservation.findFirst({
      where: {
        id,
        users: {
          some: {
            id: user_id as string,
          },
        },
      },
    })
  ) {
    // also delete the reservation guests, i think the implicit many-to-many handles that
    reservation = await prisma.reservation.delete({
      where: {
        id,
      },
    });
  }
  res.json(reservation);
});

// middleware that will match(and 404) if user tries to go to random route
app.use("/", (req, res, next) => {
  const newError = new CustomError(
    404,
    "Sorry, the requested resource couldn't be found"
  );
  next(newError);
});

// catch all error handler
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  console.log(err);
  console.log(err instanceof Error);
  if (err instanceof CustomError) {
    const { message, statusCode = 500 } = err;
    res.status(statusCode).send({
      message,
      statusCode,
    });
  } else {
    res.status(500).send({ message: "Unknown Error" });
  }
});
const server = app.listen(3000, () =>
  console.log(`
🚀 Server ready at: http://localhost:3000 `)
);
