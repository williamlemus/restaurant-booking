import { Prisma, PrismaClient } from "@prisma/client";
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

// endpoints needed:
app.post(`/reservation`, async (req, res, next) => {
  const { user_ids, time, restaurant_id } = req.body;

  const startTime = new Date(time);
  try {
    // add validations/errors for each field

    // Check no one has taken up the time
    // Check that they have all the required endorsements
    // Check the table is still available
    // fix this... if no table found, you should not reserve
    const tableId = (await prisma.table.findFirst())?.id as string;
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
    next(new CustomError(400, "Sorry, couldn't make a new reservation"));
  }
});

app.get(
  "/reservation/search",
  async (req: Request<{ user_ids: string[]; time: string }>, res) => {
    const { user_ids = [], time } = req.query;
    const startTime = typeof time === "string" ? new Date(time) : new Date();
    // iteration two will also take into account endorsement/restrictions
    const lowerBound = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate(),
      startTime.getHours() - RESERVATION_LENGTH_IN_HOURS,
      startTime.getMinutes()
    );
    const upperBound = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate(),
      startTime.getHours() + RESERVATION_LENGTH_IN_HOURS,
      startTime.getMinutes()
    );
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
        startTime: true,
      },
    });

    const endorsements = await prisma.endorsement.findMany({
      where: { users: { some: { id: {in: user_ids as string[]} } }},
      select: {
        id: true,
        endorsement_name: true,
        users: {
          select: {
            name: true,
          }
        }
      } 
    });

    // check that there are enough tables for the given guests
    const availableRestaurants = await prisma.restaurant.findMany({
      where: {
        NOT: {
          id: {
            in: reservations.map((reservation) => reservation.restaurantId),
          },
        },
        AND: endorsements.map(endorsement => ({ endorsements: { some: {  id: endorsement.id,  }, } })),
      },
      select: {
        endorsements: true,
        id: true,
        name: true,
      }
      
    });
    res.json(availableRestaurants);
  }
);

app.delete(`/reservation/:id`, async (req, res) => {
  const { id } = req.params;
  // also delete the reservation guests, i think the implicit many-to-many handles that
  const reservation = await prisma.reservation.delete({
    where: {
      id,
    },
  });
  res.json(reservation);
});


// middleware that will match(and 404) if user tries to go to random route
app.use("/", (req, res, next) => {
  const newError = new CustomError(
    404,
    "Sorry, the request resource couldn't be found"
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
