import { BlockRecurrence, type ScheduleBlock } from "@prisma/client";
import { db } from "./db";

export type BlockOccurrence = {
  blockId: string;
  reason: string;
  start: Date;
  end: Date;
  professionalId: string | null;
  recurrence: BlockRecurrence;
};

type ExpandableBlock = Pick<
  ScheduleBlock,
  "id" | "reason" | "start" | "end" | "recurrence" | "recurrenceUntil" | "professionalId"
>;

export function rangesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function expandScheduleBlocks(
  blocks: ExpandableBlock[],
  rangeStart: Date,
  rangeEnd: Date,
): BlockOccurrence[] {
  const occurrences: BlockOccurrence[] = [];

  for (const block of blocks) {
    const duration = block.end.getTime() - block.start.getTime();
    if (duration <= 0) continue;
    const stepDays = block.recurrence === BlockRecurrence.DAILY ? 1 : 7;
    let occurrenceStart = new Date(block.start);

    if (block.recurrence !== BlockRecurrence.NONE && occurrenceStart < rangeStart) {
      while (new Date(occurrenceStart.getTime() + duration) <= rangeStart) {
        occurrenceStart.setDate(occurrenceStart.getDate() + stepDays);
      }
    }

    while (occurrenceStart < rangeEnd) {
      if (block.recurrenceUntil && occurrenceStart > block.recurrenceUntil) break;
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
      if (rangesOverlap(occurrenceStart, occurrenceEnd, rangeStart, rangeEnd)) {
        occurrences.push({
          blockId: block.id,
          reason: block.reason,
          start: new Date(occurrenceStart),
          end: occurrenceEnd,
          professionalId: block.professionalId,
          recurrence: block.recurrence,
        });
      }
      if (block.recurrence === BlockRecurrence.NONE) break;
      occurrenceStart = new Date(occurrenceStart);
      occurrenceStart.setDate(occurrenceStart.getDate() + stepDays);
    }
  }

  return occurrences.sort((left, right) => left.start.getTime() - right.start.getTime());
}

export async function getBlockOccurrences({
  clinicId,
  professionalId,
  rangeStart,
  rangeEnd,
}: {
  clinicId: string;
  professionalId?: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const blocks = await db.scheduleBlock.findMany({
    where: {
      clinicId,
      AND: professionalId
        ? [{ OR: [{ professionalId }, { professionalId: null }] }]
        : undefined,
      start: { lt: rangeEnd },
      OR: [
        { recurrence: BlockRecurrence.NONE, end: { gt: rangeStart } },
        { recurrence: { not: BlockRecurrence.NONE }, recurrenceUntil: null },
        { recurrence: { not: BlockRecurrence.NONE }, recurrenceUntil: { gte: rangeStart } },
      ],
    },
  });
  return expandScheduleBlocks(blocks, rangeStart, rangeEnd);
}

export async function findConflictingBlock({
  clinicId,
  professionalId,
  start,
  end,
}: {
  clinicId: string;
  professionalId: string;
  start: Date;
  end: Date;
}) {
  const occurrences = await getBlockOccurrences({
    clinicId,
    professionalId,
    rangeStart: start,
    rangeEnd: end,
  });
  return occurrences.find((block) => rangesOverlap(start, end, block.start, block.end));
}
