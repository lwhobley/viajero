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

type PhraseSeed = [string, string, string, Region];
const restaurantItems = [['un café', 'a coffee'], ['agua sin gas', 'still water'], ['los tacos', 'the tacos'], ['una ensalada', 'a salad'], ['el desayuno', 'breakfast'], ['el plato del día', 'the daily special'], ['algo vegetariano', 'something vegetarian'], ['la cuenta', 'the check']];
const destinations = [['la estación', 'the station'], ['el centro', 'downtown'], ['el aeropuerto', 'the airport'], ['la parada de autobús', 'the bus stop'], ['el hotel', 'the hotel'], ['el museo', 'the museum'], ['la playa', 'the beach'], ['la plaza principal', 'the main square']];
const hotelNeeds = [['toallas limpias', 'clean towels'], ['otra llave', 'another key'], ['una habitación tranquila', 'a quiet room'], ['la contraseña del wifi', 'the Wi-Fi password'], ['un taxi', 'a taxi'], ['ayuda con el equipaje', 'help with the luggage']];
const conversationTopics = [['la comida local', 'the local food'], ['esta ciudad', 'this city'], ['su viaje', 'your trip'], ['su trabajo', 'your work'], ['el fin de semana', 'the weekend']];

const phraseBank: PhraseSeed[] = [
  ...restaurantItems.flatMap(([es, en]): PhraseSeed[] => [
    [`Quisiera ${es}, por favor.`, `I would like ${en}, please.`, 'Restaurants', 'Everywhere'],
    [`¿Tiene ${es}?`, `Do you have ${en}?`, 'Restaurants', 'Everywhere'],
    [`Para mí, ${es}.`, `For me, ${en}.`, 'Restaurants', 'Everywhere'],
    [`¿Me trae ${es}, por favor?`, `Could you bring me ${en}, please?`, 'Restaurants', 'Everywhere'],
  ]),
  ...destinations.flatMap(([es, en]): PhraseSeed[] => [
    [`¿Dónde está ${es}?`, `Where is ${en}?`, 'Transportation', 'Everywhere'],
    [`¿Cómo llego a ${es}?`, `How do I get to ${en}?`, 'Transportation', 'Everywhere'],
    [`¿Este autobús va a ${es}?`, `Does this bus go to ${en}?`, 'Transportation', 'Everywhere'],
    [`Quiero ir a ${es}.`, `I want to go to ${en}.`, 'Transportation', 'Everywhere'],
  ]),
  ...hotelNeeds.flatMap(([es, en]): PhraseSeed[] => [
    [`Necesito ${es}, por favor.`, `I need ${en}, please.`, 'Hotels', 'Everywhere'],
    [`¿Puede traerme ${es}?`, `Can you bring me ${en}?`, 'Hotels', 'Everywhere'],
    [`¿Puedo pedir ${es}?`, `Can I request ${en}?`, 'Hotels', 'Everywhere'],
    [`¿Me ayuda a conseguir ${es}?`, `Can you help me get ${en}?`, 'Hotels', 'Everywhere'],
  ]),
  ...conversationTopics.flatMap(([es, en]): PhraseSeed[] => [
    [`Me gusta mucho ${es}.`, `I really like ${en}.`, 'Conversation', 'Everywhere'],
    [`Quiero conocer mejor ${es}.`, `I want to learn more about ${en}.`, 'Conversation', 'Everywhere'],
    [`¿Qué piensa de ${es}?`, `What do you think about ${en}?`, 'Conversation', 'Everywhere'],
    [`Cuénteme sobre ${es}.`, `Tell me about ${en}.`, 'Conversation', 'Everywhere'],
  ]),
  ['¿Puede repetirlo más despacio?', 'Can you repeat that more slowly?', 'Repair', 'Everywhere'],
  ['No entendí la última parte.', 'I did not understand the last part.', 'Repair', 'Everywhere'],
  ['¿Qué significa esa palabra?', 'What does that word mean?', 'Repair', 'Everywhere'],
  ['¿Cómo se dice esto en español?', 'How do you say this in Spanish?', 'Repair', 'Everywhere'],
  ['¿Lo puede escribir?', 'Can you write it down?', 'Repair', 'Everywhere'],
  ['¿Quiere decir que sale a las ocho?', 'Do you mean it leaves at eight?', 'Repair', 'Everywhere'],
  ['Déjeme pensar un momento.', 'Let me think for a moment.', 'Repair', 'Everywhere'],
  ['Entiendo la idea, pero no todos los detalles.', 'I understand the idea, but not every detail.', 'Repair', 'Everywhere'],
  ['Pura vida.', 'All good / pure life.', 'Regional', 'Costa Rica'],
  ['¿Cuánto cuesta el pasaje?', 'How much is the fare?', 'Regional', 'Costa Rica'],
  ['¡Qué padre!', 'How cool!', 'Regional', 'Mexico'],
  ['Ahorita regreso.', 'I will be back shortly.', 'Regional', 'Mexico'],
  ['¿Me regala una botella de agua?', 'Could I have a bottle of water?', 'Regional', 'Costa Rica'],
  ['Vale, perfecto.', 'Okay, perfect.', 'Regional', 'Spain'],
  ['¡Qué guay!', 'How cool!', 'Regional', 'Spain'],
  ['¿Dónde está el aseo?', 'Where is the restroom?', 'Regional', 'Spain'],
  ['Necesito una farmacia.', 'I need a pharmacy.', 'Practical', 'Everywhere'],
  ['¿Aceptan tarjeta?', 'Do you accept cards?', 'Practical', 'Everywhere'],
  ['¿Cuánto cuesta?', 'How much does it cost?', 'Practical', 'Everywhere'],
  ['Tengo una reservación.', 'I have a reservation.', 'Practical', 'Everywhere'],
  ['¿A qué hora abre?', 'What time does it open?', 'Practical', 'Everywhere'],
  ['¿Hay otra opción?', 'Is there another option?', 'Practical', 'Everywhere'],
  ['Estoy buscando este lugar.', 'I am looking for this place.', 'Practical', 'Everywhere'],
  ['Muchas gracias por su ayuda.', 'Thank you very much for your help.', 'Practical', 'Everywhere'],
];

function categoryForUnit(unit: string): string {
  if (unit === 'Restaurants') return 'Restaurants';
  if (unit === 'Transportation') return 'Transportation';
  if (unit === 'Hotels') return 'Hotels';
  if (unit === 'Regional listening') return 'Regional';
  if (unit === 'Repair strategies') return 'Repair';
  if (['Meeting locals', 'Conversation', 'Listening', 'Pronunciation'].includes(unit)) return 'Conversation';
  return 'Practical';
}

export const course: Day[] = Array.from({ length: 90 }, (_, index) => {
  const [baseTitle, unit, focus, region] = modules[index % modules.length];
  const cycle = Math.floor(index / modules.length) + 1;
  const title = cycle === 1 ? baseTitle : `${baseTitle} · Level ${cycle}`;
  return { id: `day-${index + 1}`, day: index + 1, title, unit, focus, mission: `Practice ${focus.toLowerCase()} in a real travel exchange.`, minutes: 120, region, phraseIds: [] };
});

export const phrases: Phrase[] = course.flatMap((day, dayIndex) => {
  const category = categoryForUnit(day.unit);
  const candidates = phraseBank.filter((phrase) => phrase[2] === category);
  const start = (dayIndex * 4) % candidates.length;
  return Array.from({ length: 4 }, (_, index) => candidates[(start + index) % candidates.length]).map(([spanish, english, phraseCategory, region], index) => ({ id: `${day.id}-phrase-${index + 1}`, spanish, english, category: phraseCategory, region, day: day.day }));
});

course.forEach((day) => { day.phraseIds = phrases.filter((phrase) => phrase.day === day.day).map((phrase) => phrase.id); });

export type SceneLine = { who: string; es: string; en: string };
const restaurantScene: SceneLine[] = [
  { who: 'SERVER', es: 'Buenas tardes. ¿Qué le gustaría?', en: 'Good afternoon. What would you like?' },
  { who: 'YOU', es: 'Quisiera los tacos al pastor, por favor.', en: "I'd like the tacos al pastor, please." },
  { who: 'SERVER', es: '¿Para tomar?', en: 'To drink?' },
  { who: 'YOU', es: 'Agua sin gas, por favor.', en: 'Still water, please.' },
  { who: 'SERVER', es: '¿Algo más?', en: 'Anything else?' },
  { who: 'YOU', es: 'No, gracias. Eso es todo.', en: "No, thank you. That's all." },
];

const hotelScene: SceneLine[] = [
  { who: 'RECEPTION', es: 'Buenas tardes. ¿Tiene reservación?', en: 'Good afternoon. Do you have a reservation?' },
  { who: 'YOU', es: 'Sí, tengo una reservación a nombre de López.', en: 'Yes, I have a reservation under López.' },
  { who: 'RECEPTION', es: 'Perfecto. ¿Me permite su identificación?', en: 'Perfect. May I see your ID?' },
  { who: 'YOU', es: 'Claro. ¿A qué hora es el desayuno?', en: 'Of course. What time is breakfast?' },
  { who: 'RECEPTION', es: 'De siete a diez, en la planta baja.', en: 'From seven to ten, on the ground floor.' },
  { who: 'YOU', es: 'Muchas gracias por su ayuda.', en: 'Thank you very much for your help.' },
];
const transportationScene: SceneLine[] = [
  { who: 'AGENT', es: 'Buenos días. ¿Adónde quiere ir?', en: 'Good morning. Where do you want to go?' },
  { who: 'YOU', es: 'Quiero ir al centro, por favor.', en: 'I want to go downtown, please.' },
  { who: 'AGENT', es: 'El próximo autobús sale a las nueve.', en: 'The next bus leaves at nine.' },
  { who: 'YOU', es: '¿Cuánto tarda?', en: 'How long does it take?' },
  { who: 'AGENT', es: 'Tarda unos treinta minutos.', en: 'It takes about thirty minutes.' },
  { who: 'YOU', es: 'Un boleto de ida, por favor.', en: 'A one-way ticket, please.' },
];
const conversationScene: SceneLine[] = [
  { who: 'LOCAL', es: 'Hola, ¿de dónde eres?', en: 'Hi, where are you from?' },
  { who: 'YOU', es: 'Soy de Texas. Mucho gusto.', en: 'I am from Texas. Nice to meet you.' },
  { who: 'LOCAL', es: '¿Qué te parece la ciudad?', en: 'What do you think of the city?' },
  { who: 'YOU', es: 'Me gusta mucho la comida local.', en: 'I really like the local food.' },
  { who: 'LOCAL', es: '¿Qué vas a hacer mañana?', en: 'What are you going to do tomorrow?' },
  { who: 'YOU', es: 'Mañana voy a visitar el museo.', en: 'Tomorrow I am going to visit the museum.' },
];
const practicalScene: SceneLine[] = [
  { who: 'LOCAL', es: 'Buenos días. ¿Le puedo ayudar?', en: 'Good morning. Can I help you?' },
  { who: 'YOU', es: 'Sí, estoy buscando este lugar.', en: 'Yes, I am looking for this place.' },
  { who: 'LOCAL', es: 'Está cerca de la plaza principal.', en: 'It is near the main square.' },
  { who: 'YOU', es: '¿Cómo llego allí?', en: 'How do I get there?' },
  { who: 'LOCAL', es: 'Siga derecho dos cuadras.', en: 'Go straight for two blocks.' },
  { who: 'YOU', es: 'Muchas gracias por su ayuda.', en: 'Thank you very much for your help.' },
];

export function sceneForDay(day: Day): SceneLine[] {
  if (day.unit === 'Restaurants') return restaurantScene;
  if (day.unit === 'Hotels') return hotelScene;
  if (day.unit === 'Transportation') return transportationScene;
  if (['Meeting locals', 'Conversation', 'Listening', 'Pronunciation'].includes(day.unit)) return conversationScene;
  return practicalScene;
}

export const scene = restaurantScene;
