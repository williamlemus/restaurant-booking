import { RESERVATION_LENGTH_IN_HOURS } from "./constants";

export const calculateTimeRange = (
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