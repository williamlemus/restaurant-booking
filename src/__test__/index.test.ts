import request from "supertest";
import { app } from "../index";
import { prismaMock } from "../__mocks__/prisma";
import { Prisma, Reservation, User } from "@prisma/client";

describe("index", () => {
  it("should return error message searching with no params", async () => {
    // search without anything returns error as
    const response = await request(app).get("/reservation/search");

    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual("Invalid or missing inputs provided for: user_ids, time");
  });

  describe("delete reservation", () => {
    // create reservation here
    it("should delete reservation", async () => {
      const reservation = {
        id: "e52bfd99-3bb4-4ff5-bf4b-f267175b5a51",
        startTime: new Date("2024-05-14T23:30:00.000Z"),
        endTime: new Date("2024-05-15T01:30:00.000Z"),
        restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        tableId: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
      };
      prismaMock.reservation.delete.mockResolvedValue(reservation);
      prismaMock.reservation.findFirst.mockResolvedValue(reservation);
      const response = await request(app).delete(
        "/reservation/e52bfd99-3bb4-4ff5-bf4b-f267175b5a51"
      ).send({user_id: "05600976-2ff3-4bcb-b321-bc55e36d88f5"});
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        id: "e52bfd99-3bb4-4ff5-bf4b-f267175b5a51",
        startTime: "2024-05-14T23:30:00.000Z",
        endTime: "2024-05-15T01:30:00.000Z",
        restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        tableId: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
      });
    });
    it("should return 404 for invalid reservation", (done) => {
      request(app).delete("/reservation/5").send({ user_id: '05600976-2ff3-4bcb-b321-bc55e36d88f5'}).expect(404, done);
    });
  });

  describe("make reservation", () => {
    it("should not allow reservations in the past", async () => {
      const body = {
        user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5"],
        time: "Wed May 10 2023 18:30:00 GMT-0500",
        restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
      };
      const response = await request(app).post("/reservation").send(body);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Cannot make reservation in the past!"
      );
    });

    it("should not allow reservations with unmatching endorsements", async () => {
      const body = {
        user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5", "f841d16c-d121-4ca3-a9de-1355cedd1369"],
        time: new Date(Date.now() + 3000000),
        restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
      };
      const users = [
        {
          id: "05600976-2ff3-4bcb-b321-bc55e36d88f5",
          name: "Jim",
          restrictions: [{ id: "dc4e1d4b-d0b5-40e5-a6f5-171792471f59" }],
          email: "Jim@jim.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
        {
          id: "f841d16c-d121-4ca3-a9de-1355cedd1369",
          name: "John",
          restrictions: [],
          email: "John@john.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      // mock endorsements from restaurant with different/no endorsements
      prismaMock.endorsement.findMany.mockResolvedValue([
        {
          id: "817691f0-c6fe-41fa-8150-4935a36f5b70",
          endorsement_name: "Vegetarian-Friendly",
          restriction_name: "Vegetarian",
        },
      ]);
      const response = await request(app).post("/reservation").send(body);
      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Restaurant does not accomodate dietary preferences"
      );
    });

    it("should not allow overlapping reservations", async () => {
      const body = {
        user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5", "f841d16c-d121-4ca3-a9de-1355cedd1369"],
        time: new Date(Date.now() + 3000000),
        restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
      };
      // mock user response with restrictions
      const users = [
        {
          id: "05600976-2ff3-4bcb-b321-bc55e36d88f5",
          name: "Jim",
          restrictions: [{ id: "817691f0-c6fe-41fa-8150-4935a36f5b70" }],
          email: "Jim@jim.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
        {
          id: "f841d16c-d121-4ca3-a9de-1355cedd1369",
          name: "John",
          restrictions: [],
          email: "John@john.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      prismaMock.endorsement.findMany.mockResolvedValue([
        {
          id: "817691f0-c6fe-41fa-8150-4935a36f5b70",
          endorsement_name: "Vegetarian-Friendly",
          restriction_name: "Vegetarian",
        },
      ]);
      // Reservation that's in the time window
      const reservations = [
        {
          id: "e52bfd99-3bb4-4ff5-bf4b-f267175b5a51",
          startTime: new Date(),
          endTime: new Date(Date.now() + 30000),
          restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
          tableId: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
        },
      ];
      prismaMock.reservation.findMany.mockResolvedValue(reservations);
      const response = await request(app).post("/reservation").send(body);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Someone in your party already has a reservation!"
      );
    });

    it("should not allow reserving if no tables available", async () => {
      const body = {
        user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5", "f841d16c-d121-4ca3-a9de-1355cedd1369"],
        time: new Date(Date.now() + 3000000),
        restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
      };
      // mock user response with restrictions
      const users = [
        {
          id: "05600976-2ff3-4bcb-b321-bc55e36d88f5",
          name: "Jim",
          restrictions: [{ id: "817691f0-c6fe-41fa-8150-4935a36f5b70" }],
          email: "Jim@jim.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
        {
          id: "f841d16c-d121-4ca3-a9de-1355cedd1369",
          name: "John",
          restrictions: [],
          email: "John@john.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      prismaMock.endorsement.findMany.mockResolvedValue([
        {
          id: "817691f0-c6fe-41fa-8150-4935a36f5b70",
          endorsement_name: "Vegetarian-Friendly",
          restriction_name: "Vegetarian",
        },
      ]);
      prismaMock.reservation.findMany.mockResolvedValue([]);
      prismaMock.table.findMany.mockResolvedValue([]);
      const response = await request(app).post("/reservation").send(body);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "No tables are available! Please try another time"
      );
    });

    it("should not allow reserving if no there's an unknown user", async () => {
        const body = {
          user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5", "f841d16c-d121-4ca3-a9de-1355cedd1369"],
          time: new Date(Date.now() + 3000000),
          restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        };
        // mock user response with restrictions
        const users = [
          {
            id: "05600976-2ff3-4bcb-b321-bc55e36d88f5",
            name: "Jim",
            restrictions: [{ id: "817691f0-c6fe-41fa-8150-4935a36f5b70" }],
            email: "Jim@jim.com",
            latitude: "19.09486",
            longitude: "-45.098654",
          },
        ];
        prismaMock.user.findMany.mockResolvedValue(users);
        prismaMock.endorsement.findMany.mockResolvedValue([
          {
            id: "817691f0-c6fe-41fa-8150-4935a36f5b70",
            endorsement_name: "Vegetarian-Friendly",
            restriction_name: "Vegetarian",
          },
        ]);
        prismaMock.reservation.findMany.mockResolvedValue([]);
        prismaMock.table.findMany.mockResolvedValue([]);
        const response = await request(app).post("/reservation").send(body);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
          "Some of the people in your party do not have an account!"
        );
      });

    it("should reserve table successfully", async () => {
      const time = new Date(Date.now() + 3000000);
      const endTime = new Date(time.getTime() + 3_600_000);
      const body = {
        user_ids: ["05600976-2ff3-4bcb-b321-bc55e36d88f5", "f841d16c-d121-4ca3-a9de-1355cedd1369"],
        time,
        restaurant_id: "ce161c58-2ff3-4d12-9cad-c304182501bb",
      };
      // mock user response with restrictions
      const users = [
        {
          id: "05600976-2ff3-4bcb-b321-bc55e36d88f5",
          name: "Jim",
          restrictions: [{ id: "817691f0-c6fe-41fa-8150-4935a36f5b70" }],
          email: "Jim@jim.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
        {
          id: "f841d16c-d121-4ca3-a9de-1355cedd1369",
          name: "John",
          restrictions: [],
          email: "John@john.com",
          latitude: "19.09486",
          longitude: "-45.098654",
        },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      prismaMock.endorsement.findMany.mockResolvedValue([
        {
          id: "817691f0-c6fe-41fa-8150-4935a36f5b70",
          endorsement_name: "Vegetarian-Friendly",
          restriction_name: "Vegetarian",
        },
      ]);
      prismaMock.reservation.findMany.mockResolvedValue([]);
      prismaMock.table.findMany.mockResolvedValue([
        {
          id: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
          capacity: 4,
          restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        },
        {
          id: "7421ad21-a5c3-48d7-9cb6-edcc1cc8da44",
          capacity: 6,
          restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        },
      ]);
      prismaMock.reservation.create.mockResolvedValue({
        id: "e52bfd99-3bb4-4ff5-bf4b-f267175b5a51",
        startTime: time,
        endTime: endTime,
        restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        tableId: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
      });
      const response = await request(app).post("/reservation").send(body);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        endTime: endTime.toISOString(),
        id: "e52bfd99-3bb4-4ff5-bf4b-f267175b5a51",
        restaurantId: "ce161c58-2ff3-4d12-9cad-c304182501bb",
        startTime: time.toISOString(),
        tableId: "d3b9eb4f-f659-49fe-9575-ac3638ed7762",
      });
    });
  });
});
