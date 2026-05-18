export interface Reminder {
  text: string;
  source: string;
  arabic?: string;
}

// Authentic ahadith and Qur'anic reminders to encourage consistency.
export const REMINDERS: Reminder[] = [
  {
    text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.",
    source: "Sahih al-Bukhari 6464, Sahih Muslim 783",
  },
  {
    text: "Do good deeds properly, sincerely and moderately. Always adopt a middle, moderate, regular course.",
    source: "Sahih al-Bukhari 6463",
  },
  {
    text: "Verily, with hardship comes ease.",
    arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
    source: "Qur'an 94:6",
  },
  {
    text: "Allah does not burden a soul beyond that it can bear.",
    arabic: "لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    source: "Qur'an 2:286",
  },
  {
    text: "Whoever takes a path in search of knowledge, Allah will make easy for him a path to Paradise.",
    source: "Sahih Muslim 2699",
  },
  {
    text: "Take benefit of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.",
    source: "Reported by al-Hakim, Sahih",
  },
  {
    text: "Whoever relies upon Allah, then He is sufficient for him.",
    arabic: "وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ",
    source: "Qur'an 65:3",
  },
  {
    text: "The strong believer is more beloved to Allah than the weak believer, and in both there is good.",
    source: "Sahih Muslim 2664",
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari 13, Sahih Muslim 45",
  },
  {
    text: "Indeed, Allah is with those who are patient.",
    arabic: "إِنَّ ٱللَّهَ مَعَ ٱلصَّابِرِينَ",
    source: "Qur'an 2:153",
  },
  {
    text: "Whoever Allah wishes good for, He grants him understanding of the religion.",
    source: "Sahih al-Bukhari 71, Sahih Muslim 1037",
  },
  {
    text: "Actions are but by intentions, and every man shall have only that which he intended.",
    source: "Sahih al-Bukhari 1, Sahih Muslim 1907",
  },
  {
    text: "And remember Me; I will remember you.",
    arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ",
    source: "Qur'an 2:152",
  },
  {
    text: "He who does not thank people, does not thank Allah.",
    source: "Sunan Abi Dawud 4811, Sahih",
  },
];

export function reminderOfTheDay(): Reminder {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return REMINDERS[dayOfYear % REMINDERS.length];
}

// Backwards-compatible alias (older imports).
export const quoteOfTheDay = reminderOfTheDay;
