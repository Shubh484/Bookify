import { parse, addMinutes, isBefore, isEqual, format } from 'date-fns';

export const START_TIME = '08:00';
export const END_TIME = '20:00';
export const SLOT_DURATION = 30; // minutes

export function generateSlots(dateStr: string): string[] {
  const slots: string[] = [];
  let current = parse(`${dateStr} ${START_TIME}`, 'yyyy-MM-dd HH:mm', new Date());
  const end = parse(`${dateStr} ${END_TIME}`, 'yyyy-MM-dd HH:mm', new Date());

  while (isBefore(current, end)) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, SLOT_DURATION);
  }

  return slots;
}

export function getSlotCount(startTime: string, endTime: string): number {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  
  if (isBefore(end, start) || isEqual(end, start)) {
    return 0;
  }
  
  const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return Math.ceil(diffMinutes / SLOT_DURATION);
}

export function getSlotList(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  let current = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());

  while (isBefore(current, end)) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, SLOT_DURATION);
  }

  return slots;
}
