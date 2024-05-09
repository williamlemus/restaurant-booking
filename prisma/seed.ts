import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const endorsementData: Prisma.EndorsementCreateInput[] = [
  {
    endorsement_name: "Gluten-Free Options",
    restriction_name: "Gluten-Free",
  },
  {
    endorsement_name: "Vegan-Friendly",
    restriction_name: "Vegan",
  },
  {
    endorsement_name: "Vegetarian-Friendly",
    restriction_name: "Vegetarian",
  },
  {
    endorsement_name: "Paleo-friendly",
    restriction_name: "Paleo",
  },
];

const restaurantData: Prisma.RestaurantCreateInput[] = [
  {
    name: "Lardo",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
  {
    name: "Panadería Rosetta",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
  {
    name: "Tetetlán",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
  {
    name: "Falling Piano Brewing Co",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
  {
    name: "u.to.pi.a",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
  {
    name: "Bluth's Original Frozen Banana Stand",
    latitude: "19.4153107",
    longitude: "-99.1804722",
  },
];

const userData: Prisma.UserCreateInput[] = [
  {
    name: "Michael",
    latitude: "19.4153107",
    longitude: "-99.1804722",
    email: "michael@sample.com",
  },
  {
    name: "George Michael",
    latitude: "19.3634215",
    longitude: "-99.1671942",
    email: "GeorgeMichael@sample.com",
  },
  {
    name: "Lucile",
    latitude: "19.3634215",
    longitude: "-99.1769323",
    email: "Lucile@sample.com",
  },
  {
    name: "Gob",
    latitude: "19.3318331",
    longitude: "-99.2078983",
    email: "Gob@sample.com",
  },
  {
    name: "Tobias",
    latitude: "19.4384214",
    longitude: "-99.2036906",
    email: "Tobias@sample.com",
  },
  {
    name: "Maeby",
    latitude: "19.4349474",
    longitude: "-99.1419256",
    email: "Maeby@sample.com",
  },
];

const userRestrictions: { [key: string]: string } = {
  Michael: "Vegetarian",
  "George Michael": "Gluten-Free",
  Gob: "Paleo",
};

const restaurantEndorsements: {[key: string]: string} = {
  Lardo: "Gluten-Free Options",
};

async function main() {
  console.log(`Start seeding ...`);
  const endorsements = [];
  for (const e of endorsementData) {
    const endorsement = await prisma.endorsement.create({
      data: e,
    });
    endorsements.push(endorsement);
    console.log(`Created endorsement with id: ${endorsement.id}`);
  }
  for (const u of userData) {
    const endorsement =
      endorsements.find(
        (el) => el.restriction_name === userRestrictions[u.name]
      ) || undefined;
    const payload = u;
    if (endorsement) {
      payload.restrictions = { connect: [{ id: endorsement.id }] };
    }
    const user = await prisma.user.create({
      data: payload,
    });

    console.log(`Created user with id: ${user.id}`);
  }
  
  for (const r of restaurantData) {
    const endorsement =
      endorsements.find(
        (el) => el.endorsement_name === restaurantEndorsements[r.name]
      ) || undefined;
    const payload = r;
    if (endorsement) {
      payload.endorsements = { connect: [{ id: endorsement.id }] };
    }
    const restaurant = await prisma.restaurant.create({
      data: payload,
    });

    console.log(`Created restaurant with id: ${restaurant.id}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
