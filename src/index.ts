import { Reservation } from "@prisma/client";
import prisma from "./lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import express, { NextFunction, Request, Response } from "express";
import { CustomError } from "./lib/customError";
import { calculateTimeRange } from "./lib/utils";
import { RESERVATION_LENGTH_IN_HOURS } from "./lib/constants";
import { validate } from "./lib/middlewares";
import { SearchSchema } from "./lib/schema/search.schema";
import { CreateReservationSchema, DeleteReservationSchema } from "./lib/schema/reservation.schema";

export const app = express();

app.use(express.json());

app.post(`/reservation`, validate(CreateReservationSchema), async (req, res, next) => {
  const { user_ids, time, restaurant_id } = req.body;

  const startTime = new Date(time);
  if (new Date() > startTime) {
    return res
      .status(400)
      .send({ message: "Cannot make reservation in the past!" });
  }
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
        where: { restaurants: { some: { id: restaurant_id } } },
        select: { id: true },
      })
    ).map((elem) => elem.id);
    if (
      !restriction_ids.every((restriction) =>
        endorsements.includes(restriction)
      )
    ) {
      return res
        .status(401)
        .json({
          message: "Restaurant does not accomodate dietary preferences",
        });
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
      return res.json({
        message: "Someone in your party already has a reservation!",
      });
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
      return res.json({
        message: "No tables are available! Please try another time",
      });
    }

    const tableId = freeTables[0].id;
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
  "/reservation/search", validate(SearchSchema),
    async (req: Request, res) => {
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

app.delete(`/reservation/:id`, validate(DeleteReservationSchema), async (req: Request, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  let reservation: Reservation | Record<never, object> = {};
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
    // Prisma's implicit many-to-many handles deleting the guest reservations
    reservation = await prisma.reservation.delete({
      where: {
        id,
      },
    });
    return res.json(reservation);
  }
  res.status(404).json({ message: "Reservation not found!" });
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
