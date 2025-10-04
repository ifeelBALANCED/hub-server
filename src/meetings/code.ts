import { customAlphabet } from 'nanoid';

// Generate meeting codes like 'abc-defg-hij'
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 3);

export const generateMeetingCode = (): string => {
  const part1 = nanoid();
  const part2 = customAlphabet(alphabet, 4)();
  const part3 = nanoid();
  return `${part1}-${part2}-${part3}`;
};

export const validateMeetingCode = (code: string): boolean => {
  const regex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  return regex.test(code);
};

export const normalizeMeetingCode = (code: string): string => {
  return code.toLowerCase().trim();
};
