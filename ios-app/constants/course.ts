export type Region = 'Mexico' | 'Costa Rica' | 'Spain' | 'Everywhere';

export type Phrase = {
  id: string;
  spanish: string;
  english: string;
  category: string;
  region: Region;
  day: number;
};

export type Day = {
  id: string;
  day: number;
  title: string;
  unit: string;
  focus: string;
  mission: string;
  minutes: number;
  region: Region;
  phraseIds: string[];
};

const modules: Array<[string, string, string, Region]> = [
  ['Arrive with confidence', 'Foundations', 'Greetings, courtesy, and the sounds of Spanish', 'Everywhere'],
  ['Order breakfast', 'Restaurants', 'Coffee, breakfast, and polite requests', 'Mexico'],
  ['Customize your order', 'Restaurants', 'Preferences, allergies, and substitutions', 'Everywhere'],
  ['Pay naturally', 'Restaurants', 'The check, tips, and goodbyes', 'Everywhere'],
  ['Find the platform', 'Transportation', 'Stations, tickets, and schedules', 'Spain'],
  ['Take a taxi', 'Transportation', 'Directions, landmarks, and destinations', 'Everywhere'],
  ['Ride the bus', 'Transportation', 'Stops, transfers, and timing', 'Costa Rica'],
  ['Check in smoothly', 'Hotels', 'Reservations, identification, and rooms', 'Everywhere'],
  ['Ask for hotel help', 'Hotels', 'Wi-Fi, towels, breakfast, and checkout', 'Everywhere'],
  ['Fix a room problem', 'Hotels', 'Polite complaints and solutions', 'Everywhere'],
  ['Make plans', 'Practical Spanish', 'Invitations, availability, and changes', 'Everywhere'],
  ['Listen for the gist', 'Listening', 'Reduced speech and key words', 'Everywhere'],
  ['Introduce yourself', 'Meeting locals', 'Where you are from and what you enjoy', 'Everywhere'],
  ['Ask better questions', 'Meeting locals', 'Follow-ups that keep a conversation going', 'Everywhere'],
  ['Tell a travel story', 'Conversation', 'Simple past experiences', 'Everywhere'],
  ['Make future plans', 'Conversation', 'Near-future plans and invitations', 'Everywhere'],
  ['Get unstuck', 'Repair strategies', 'Clarification and confirmation', 'Everywhere'],
  ['Speak with confidence', 'Pronunciation', 'Stress, rhythm, and linking', 'Everywhere'],
  ['Mexico listening lab', 'Regional listening', 'Mexican vocabulary and rhythm', 'Mexico'],
  ['Costa Rica listening lab', 'Regional listening', 'Pura vida and local courtesy', 'Costa Rica'],
  ['Spain listening lab', 'Regional listening', 'Vosotros and everyday vocabulary', 'Spain'],
  ['Handle an unexpected change', 'Problem-solving', 'Delays, cancellations, and alternatives', 'Everywhere'],
  ['Health and safety', 'Problem-solving', 'Pharmacy, symptoms, and urgent help', 'Everywhere'],
  ['Money and shopping', 'Practical Spanish', 'Sizes, prices, cash, and cards', 'Everywhere'],
  ['Mission: day trip', 'Mission', 'All travel skills under time pressure', 'Everywhere'],
  ['Conversation with locals', 'Meeting locals', 'Weather, food, family, and place', 'Everywhere'],
  ['Listen without subtitles', 'Listening', 'Context, prediction, and gist', 'Everywhere'],
  ['Sound more natural', 'Pronunciation', 'Fillers, pauses, and intonation', 'Everywhere'],
  ['Restaurant simulation', 'Full simulation', 'Arrival to payment', 'Everywhere'],
  ['Hotel simulation', 'Full simulation', 'Check-in to checkout', 'Everywhere'],
  ['Transit simulation', 'Full simulation', 'Tickets, transfers, and delays', 'Everywhere'],
  ['Market simulation', 'Full simulation', 'Shopping and recommendations', 'Mexico'],
  ['Nature excursion', 'Full simulation', 'Weather, safety, and plans', 'Costa Rica'],
  ['City weekend', 'Full simulation', 'Social Spanish across a weekend', 'Spain'],
  ['Fast speech lab', 'Listening', 'Natural speed and connected speech', 'Everywhere'],
  ['No-translation day', 'Immersion', 'Thinking in simple Spanish', 'Everywhere'],
  ['Past, present, future', 'Grammar in use', 'Time frames for real stories', 'Everywhere'],
  ['Opinions and reasons', 'Conversation', 'Because, although, and so', 'Everywhere'],
  ['Advice and suggestions', 'Conversation', 'You should, you could, let’s', 'Everywhere'],
  ['Polite boundaries', 'Conversation', 'Declining and negotiating kindly', 'Everywhere'],
  ['Mission: dinner with locals', 'Mission', 'Social conversation and repair', 'Everywhere'],
  ['Regional switchboard', 'Regional listening', 'Mexico, Costa Rica, and Spain', 'Everywhere'],
  ['Catch the details', 'Listening', 'Numbers, names, and corrections', 'Everywhere'],
  ['Mission: local guide', 'Mission', 'Explaining a route and recommendation', 'Everywhere'],
  ['Full restaurant day', 'Assessment', 'Fluency under familiar pressure', 'Everywhere'],
  ['Full transit day', 'Assessment', 'Listening and repair under pressure', 'Everywhere'],
  ['Full social day', 'Assessment', 'Meeting, asking, responding, and closing', 'Everywhere'],
  ['Final listening lab', 'Assessment', 'Gist plus key details', 'Everywhere'],
  ['Final conversation lab', 'Assessment', 'Sustained speaking', 'Everywhere'],
  ['Your travel voice', 'Confidence', 'Personal stories and preferences', 'Everywhere'],
  ['Your repair toolkit', 'Confidence', 'Recovering without freezing', 'Everywhere'],
  ['Your regional toolkit', 'Confidence', 'Choosing vocabulary for each country', 'Everywhere'],
  ['Mission: spontaneous trip', 'Mission', 'No-script travel problem solving', 'Everywhere'],
  ['Review the essentials', 'Review', 'High-frequency travel language', 'Everywhere'],
  ['Review the stories', 'Review', 'Personal narrative and past tense', 'Everywhere'],
  ['Review the listening', 'Review', 'Speed, gist, and detail', 'Everywhere'],
  ['Final travel rehearsal', 'Final assessment', 'Arrival to goodbye', 'Everywhere'],
  ['Celebrate and continue', 'Graduation', 'Your next 90 days of real-world practice', 'Everywhere'],
];

const phraseBank: Array<[string, string, string, Region]> = [
  ['Hola, mucho gusto.', 'Hello, nice to meet you.', 'Greetings', 'Everywhere'],
  ['¿Me puede ayudar?', 'Can you help me?', 'Repair', 'Everywhere'],
  ['¿Puede repetirlo más despacio?', 'Can you repeat it more slowly?', 'Repair', 'Everywhere'],
  ['Quisiera ___, por favor.', 'I would like ___, please.', 'Restaurants', 'Everywhere'],
  ['¿Qué me recomienda?', 'What do you recommend?', 'Restaurants', 'Everywhere'],
  ['Sin picante, por favor.', 'Without spice, please.', 'Restaurants', 'Mexico'],
  ['La cuenta, por favor.', 'The check, please.', 'Restaurants', 'Everywhere'],
  ['¿Dónde está la estación?', 'Where is the station?', 'Transportation', 'Everywhere'],
  ['¿Este autobús va al centro?', 'Does this bus go downtown?', 'Transportation', 'Costa Rica'],
  ['Un boleto de ida, por favor.', 'A one-way ticket, please.', 'Transportation', 'Spain'],
  ['¿Cuánto tarda?', 'How long does it take?', 'Transportation', 'Everywhere'],
  ['Siga derecho y luego doble a la derecha.', 'Go straight and then turn right.', 'Directions', 'Everywhere'],
  ['Tengo una reservación a nombre de ___.', 'I have a reservation under ___.', 'Hotels', 'Everywhere'],
  ['¿A qué hora es el desayuno?', 'What time is breakfast?', 'Hotels', 'Everywhere'],
  ['No funciona el aire acondicionado.', 'The air conditioning does not work.', 'Hotels', 'Everywhere'],
  ['¿Me puede recomendar un lugar?', 'Can you recommend a place?', 'Locals', 'Everywhere'],
  ['Soy de Texas, pero vivo aquí cerca.', 'I am from Texas, but I live nearby.', 'Locals', 'Everywhere'],
  ['Me gusta mucho la comida local.', 'I really like the local food.', 'Locals', 'Everywhere'],
  ['Mañana voy a visitar ___.', 'Tomorrow I am going to visit ___.', 'Conversation', 'Everywhere'],
  ['Pura vida.', 'All good / pure life.', 'Regional', 'Costa Rica'],
  ['¡Qué padre!', 'How cool!', 'Regional', 'Mexico'],
  ['Vale, perfecto.', 'Okay, perfect.', 'Regional', 'Spain'],
  ['Ahorita regreso.', 'I will be back in a little while.', 'Regional', 'Mexico'],
  ['¡Qué guay!', 'How cool!', 'Regional', 'Spain'],
  ['Con permiso.', 'Excuse me / with your permission.', 'Courtesy', 'Everywhere'],
  ['No pasa nada.', 'No problem.', 'Courtesy', 'Everywhere'],
  ['Fue un placer conocerte.', 'It was a pleasure meeting you.', 'Goodbyes', 'Everywhere'],
];

export const course: Day[] = Array.from({ length: 90 }, (_, index) => {
  const [baseTitle, unit, focus, region] = modules[index % modules.length];
  const cycle = Math.floor(index / modules.length) + 1;
  const title = cycle === 1 ? baseTitle : `${baseTitle} · Level ${cycle}`;
  return { id: `day-${index + 1}`, day: index + 1, title, unit, focus, mission: `Use today's Spanish to ${focus.toLowerCase()}.`, minutes: 120, region, phraseIds: [] };
});

export const phrases: Phrase[] = course.flatMap((day, dayIndex) => {
  const start = (dayIndex * 3) % phraseBank.length;
  return phraseBank.slice(start, start + 4).map(([spanish, english, category, region], index) => ({ id: `${day.id}-phrase-${index + 1}`, spanish, english, category, region, day: day.day }));
});

course.forEach((day) => { day.phraseIds = phrases.filter((phrase) => phrase.day === day.day).map((phrase) => phrase.id); });

export const scene = [
  { who: 'SERVER', es: 'Buenas tardes. ¿Qué le gustaría?', en: 'Good afternoon. What would you like?' },
  { who: 'YOU', es: 'Quisiera los tacos al pastor, por favor.', en: "I'd like the tacos al pastor, please." },
  { who: 'SERVER', es: '¿Para tomar?', en: 'To drink?' },
  { who: 'YOU', es: 'Agua sin gas, por favor.', en: 'Still water, please.' },
  { who: 'SERVER', es: '¿Algo más?', en: 'Anything else?' },
  { who: 'YOU', es: 'No, gracias. Eso es todo.', en: "No, thank you. That's all." },
];
