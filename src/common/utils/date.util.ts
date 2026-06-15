import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { APP } from '../constants/app.constant';

dayjs.extend(utc);
dayjs.extend(timezone);

export function nowIST(): dayjs.Dayjs {
  return dayjs().tz(APP.TIMEZONE);
}

export function todayIST(): string {
  return nowIST().format(APP.DATE_FORMAT);
}

export function toIST(date: Date | string): dayjs.Dayjs {
  return dayjs(date).tz(APP.TIMEZONE);
}

export function formatIST(date: Date | string): string {
  return toIST(date).format(APP.DATETIME_FORMAT);
}

export function timeIST(): string {
  return nowIST().format('HH:mm:ss');
}
