export interface ImmersionStory {
  id: number;
  patternId: number;
  titleEn: string;
  titleEs: string;
  bodyEs: string;
  bodyEn: string;
  questions: {
    questionEn: string;
    answerEs: string;
    answerEn: string;
  }[];
}

export const tier1Stories: ImmersionStory[] = [
  {
    id: 1,
    patternId: 1,
    titleEn: 'At the Tourist Office in Madrid',
    titleEs: 'En la oficina de turismo en Madrid',
    bodyEs:
      'María entra en la oficina de turismo en el centro de Madrid. Necesita información sobre la situación del transporte en la ciudad. La recepcionista le explica con comunicación clara: "La organización del metro es excelente. La estación principal está cerca. La educación sobre las rutas es importante para los turistas. La conversación con los locales también es una gran opción." María anota todo. La información es perfecta para su visita. Esta ciudad es una celebración de la cultura española.',
    bodyEn:
      'María enters the tourism office in the center of Madrid. She needs information about the transportation situation in the city. The receptionist explains with clear communication: "The organization of the metro is excellent. The main station is close by. Education about the routes is important for tourists. Conversation with locals is also a great option." María writes everything down. The information is perfect for her visit. This city is a celebration of Spanish culture.',
    questions: [
      {
        questionEn: 'What does María need at the tourism office?',
        answerEs: 'Necesita información sobre la situación del transporte.',
        answerEn: 'She needs information about the transportation situation.',
      },
      {
        questionEn: 'According to the receptionist, what is excellent?',
        answerEs: 'La organización del metro es excelente.',
        answerEn: 'The organization of the metro is excellent.',
      },
    ],
  },
  {
    id: 2,
    patternId: 2,
    titleEn: 'Carlos and His Efficient Day',
    titleEs: 'Carlos y su día eficiente',
    bodyEs:
      'Carlos trabaja en una empresa de tecnología en Barcelona. Generalmente, llega a la oficina temprano. Trabaja eficientemente y creativamente. Normalmente, organiza sus tareas cuidadosamente. "Simplemente necesito un buen plan," dice él. Su jefa observa que él trabaja totalmente diferente a los demás. "Habla perfectamente con los clientes y resuelve los problemas exactamente como necesitamos," dice ella. Carlos sonríe. Para él, trabajar bien es absolutamente lo más importante.',
    bodyEn:
      'Carlos works at a technology company in Barcelona. Generally, he arrives at the office early. He works efficiently and creatively. Normally, he organizes his tasks carefully. "I simply need a good plan," he says. His boss observes that he works totally differently from the others. "He speaks perfectly with clients and solves problems exactly as we need," she says. Carlos smiles. For him, working well is absolutely the most important thing.',
    questions: [
      {
        questionEn: 'How does Carlos organize his tasks?',
        answerEs: 'Organiza sus tareas cuidadosamente.',
        answerEn: 'He organizes his tasks carefully.',
      },
      {
        questionEn: 'What does his boss say about Carlos?',
        answerEs: 'Habla perfectamente con los clientes y resuelve los problemas exactamente.',
        answerEn: 'He speaks perfectly with clients and solves problems exactly as needed.',
      },
    ],
  },
  {
    id: 3,
    patternId: 3,
    titleEn: 'A Food Blogger in Barcelona',
    titleEs: 'Una bloguera de comida en Barcelona',
    bodyEs:
      'Elena es una bloguera de comida famosa. Hoy descubre un restaurante pequeño en el barrio gótico de Barcelona. La decoración es gloriosa y el ambiente es misterioso. El cocinero es generoso y curioso — le explica cada plato. "Este es nuestro plato más famoso," dice, presentando una paella deliciosa. Elena prueba la comida. Es simplemente fabulosa. "¡Esto es glorioso!" escribe en su blog. "Un restaurante famoso y delicioso en el corazón de Barcelona. No es un lugar ordinario — es extraordinario."',
    bodyEn:
      'Elena is a famous food blogger. Today she discovers a small restaurant in the Gothic Quarter of Barcelona. The decoration is glorious and the atmosphere is mysterious. The cook is generous and curious — he explains each dish to her. "This is our most famous dish," he says, presenting a delicious paella. Elena tries the food. It is simply fabulous. "This is glorious!" she writes on her blog. "A famous and delicious restaurant in the heart of Barcelona. It is not an ordinary place — it is extraordinary."',
    questions: [
      {
        questionEn: 'How does Elena describe the restaurant in her blog?',
        answerEs: 'Es famoso, delicioso y extraordinario.',
        answerEn: 'It is famous, delicious, and extraordinary.',
      },
      {
        questionEn: 'How is the cook described?',
        answerEs: 'El cocinero es generoso y curioso.',
        answerEn: 'The cook is generous and curious.',
      },
    ],
  },
  {
    id: 4,
    patternId: 4,
    titleEn: 'A Student Explains Her Goals',
    titleEs: 'Una estudiante explica sus metas',
    bodyEs:
      'Sofía es una estudiante universitaria en Ciudad de México. En una entrevista para una beca, explica sus metas con calma. "Mi educación es totalmente personal y original. Quiero trabajar en un proyecto cultural y social. Es fundamental tener una visión nacional. Generalmente, me interesan los temas médicos y legales." La profesora la escucha con atención. "Tu presentación es natural y profesional," dice. "Eso es exactamente lo que buscamos en un estudiante especial." Sofía sonríe. Es un momento central en su vida.',
    bodyEn:
      'Sofía is a university student in Mexico City. In an interview for a scholarship, she explains her goals calmly. "My education is totally personal and original. I want to work on a cultural and social project. It is fundamental to have a national vision. Generally, I am interested in medical and legal topics." The professor listens carefully. "Your presentation is natural and professional," she says. "That is exactly what we look for in a special student." Sofía smiles. It is a central moment in her life.',
    questions: [
      {
        questionEn: 'What kind of project does Sofía want to work on?',
        answerEs: 'Quiere trabajar en un proyecto cultural y social.',
        answerEn: 'She wants to work on a cultural and social project.',
      },
      {
        questionEn: 'How does the professor describe Sofía\'s presentation?',
        answerEs: 'Es natural y profesional.',
        answerEn: 'It is natural and professional.',
      },
    ],
  },
  {
    id: 5,
    patternId: 5,
    titleEn: 'Old Friends Reunite in Mexico City',
    titleEs: 'Viejos amigos se reúnen en Ciudad de México',
    bodyEs:
      'Andrés y Laura son amigos de la universidad. Hoy están en un café en el centro histórico de México. "¿Cómo estás?" pregunta Andrés. "Estoy cansada pero feliz," dice Laura. "Soy profesora ahora, ¿y tú?" "Soy médico," responde Andrés. "Trabajo en un hospital local." Los dos están contentos de verse. El café está lleno de gente y es muy animado. "Este lugar es perfecto," dice Laura. "Es exactamente como antes." Están ahí dos horas, hablando de todo. Es una conversación larga y gloriosa.',
    bodyEn:
      'Andrés and Laura are friends from university. Today they are at a café in the historic center of Mexico. "How are you?" asks Andrés. "I am tired but happy," says Laura. "I am a teacher now, and you?" "I am a doctor," responds Andrés. "I work at a local hospital." Both of them are happy to see each other. The café is full of people and is very lively. "This place is perfect," says Laura. "It is exactly like before." They are there for two hours, talking about everything. It is a long and glorious conversation.',
    questions: [
      {
        questionEn: 'What is Laura\'s occupation?',
        answerEs: 'Laura es profesora.',
        answerEn: 'Laura is a teacher.',
      },
      {
        questionEn: 'How does Laura feel when she arrives at the café?',
        answerEs: 'Está cansada pero feliz.',
        answerEn: 'She is tired but happy.',
      },
    ],
  },
  {
    id: 6,
    patternId: 6,
    titleEn: 'A Morning in a Spanish Household',
    titleEs: 'Una mañana en un hogar español',
    bodyEs:
      'Son las siete de la mañana en el hogar de la familia Ruiz en Sevilla. El padre camina a la cocina y prepara el café. La madre trabaja en su computadora. Los hijos escuchan música en su habitación. La abuela llama por teléfono y habla con toda la familia. El abuelo camina despacio por el jardín y observa las plantas. Todos trabajan juntos normalmente. A las ocho, la familia desayuna. Hablan, escuchan, y caminan. Es una mañana tranquila y perfectamente ordinaria.',
    bodyEn:
      'It is seven in the morning in the Ruiz family home in Seville. The father walks to the kitchen and prepares the coffee. The mother works on her computer. The children listen to music in their room. The grandmother calls on the phone and talks with the whole family. The grandfather walks slowly through the garden and observes the plants. Everyone works together normally. At eight, the family has breakfast. They talk, listen, and walk. It is a calm and perfectly ordinary morning.',
    questions: [
      {
        questionEn: 'What does the father do in the morning?',
        answerEs: 'Camina a la cocina y prepara el café.',
        answerEn: 'He walks to the kitchen and prepares the coffee.',
      },
      {
        questionEn: 'What do the children do in their room?',
        answerEs: 'Los hijos escuchan música.',
        answerEn: 'The children listen to music.',
      },
    ],
  },
  {
    id: 7,
    patternId: 7,
    titleEn: 'Friends Decide Where to Eat',
    titleEs: 'Amigos deciden dónde comer',
    bodyEs:
      'Pablo, Marta y Javier viven en el mismo apartamento en Buenos Aires. Es viernes por la noche y deciden comer fuera. "¿Qué quieres comer?" pregunta Marta. "Como carne casi todos los días," dice Pablo. "Prefiero comer algo diferente." Javier lee el menú de un restaurante en su teléfono. "Viven bien los chefs de este lugar," comenta. "Escriben que todo es fresco." Marta bebe agua y piensa. "Perfecto, vamos." En el restaurante, comen, beben y leen el menú con curiosidad. Es una noche famosa entre los tres amigos.',
    bodyEn:
      'Pablo, Marta, and Javier live in the same apartment in Buenos Aires. It is Friday night and they decide to eat out. "What do you want to eat?" asks Marta. "I eat meat almost every day," says Pablo. "I prefer to eat something different." Javier reads the menu of a restaurant on his phone. "The chefs at this place live well," he comments. "They write that everything is fresh." Marta drinks water and thinks. "Perfect, let\'s go." At the restaurant, they eat, drink, and read the menu with curiosity. It is a famous night among the three friends.',
    questions: [
      {
        questionEn: 'Why does Pablo want to eat something different?',
        answerEs: 'Porque come carne casi todos los días.',
        answerEn: 'Because he eats meat almost every day.',
      },
      {
        questionEn: 'What does Javier do to find a restaurant?',
        answerEs: 'Lee el menú de un restaurante en su teléfono.',
        answerEn: 'He reads the menu of a restaurant on his phone.',
      },
    ],
  },
  {
    id: 8,
    patternId: 8,
    titleEn: 'Everything Before a Trip',
    titleEs: 'Todo antes de un viaje',
    bodyEs:
      'Claudia quiere viajar a Colombia la próxima semana. Hoy prepara su lista de cosas que necesita hacer. Quiere comprar el boleto de avión primero. También quiere hablar con su jefe sobre los días libres. Necesita llamar a su banco. "Quiero comer en un restaurante famoso en Bogotá," dice a su amiga. "Y quiero visitar el mercado local." Su amiga le pregunta: "¿Quieres ir sola?" Claudia piensa. "No, quiero ir con alguien curioso y aventurero." Quiere vivir esta experiencia totalmente. Es su primer viaje internacional y lo quiere perfecto.',
    bodyEn:
      'Claudia wants to travel to Colombia next week. Today she prepares her list of things she needs to do. She wants to buy the plane ticket first. She also wants to speak with her boss about the days off. She needs to call her bank. "I want to eat at a famous restaurant in Bogotá," she tells her friend. "And I want to visit the local market." Her friend asks her: "Do you want to go alone?" Claudia thinks. "No, I want to go with someone curious and adventurous." She wants to live this experience fully. It is her first international trip and she wants it to be perfect.',
    questions: [
      {
        questionEn: 'What is the first thing Claudia wants to do for her trip?',
        answerEs: 'Quiere comprar el boleto de avión primero.',
        answerEn: 'She wants to buy the plane ticket first.',
      },
      {
        questionEn: 'Does Claudia want to travel alone?',
        answerEs: 'No, quiere ir con alguien curioso y aventurero.',
        answerEn: 'No, she wants to go with someone curious and adventurous.',
      },
    ],
  },
  {
    id: 9,
    patternId: 9,
    titleEn: 'A Busy Week Before Vacation',
    titleEs: 'Una semana ocupada antes de las vacaciones',
    bodyEs:
      'Rodrigo tiene muchas cosas que hacer antes de sus vacaciones. Puede trabajar desde casa los primeros días. Pero no puede terminar todo solo. Necesita hablar con su equipo. Puedo leer los documentos esta noche, piensa. También necesita llamar a su madre. No puede olvidar nada importante. "Puedo organizarlo todo," se dice a sí mismo. Su compañera Elena le ofrece ayuda. "Puedo escribir los informes," dice ella. "Y puedo hablar con los clientes." Rodrigo está agradecido. Juntos pueden terminar todo. Las vacaciones van a ser perfectas.',
    bodyEn:
      'Rodrigo has many things to do before his vacation. He can work from home the first few days. But he cannot finish everything alone. He needs to speak with his team. I can read the documents tonight, he thinks. He also needs to call his mother. He cannot forget anything important. "I can organize everything," he tells himself. His colleague Elena offers help. "I can write the reports," she says. "And I can speak with the clients." Rodrigo is grateful. Together they can finish everything. The vacation is going to be perfect.',
    questions: [
      {
        questionEn: 'Can Rodrigo finish everything alone?',
        answerEs: 'No, no puede terminar todo solo.',
        answerEn: 'No, he cannot finish everything alone.',
      },
      {
        questionEn: 'What does Elena offer to do?',
        answerEs: 'Puede escribir los informes y hablar con los clientes.',
        answerEn: 'She can write the reports and speak with the clients.',
      },
    ],
  },
  {
    id: 10,
    patternId: 10,
    titleEn: 'So Much to Do Before the Move',
    titleEs: 'Mucho por hacer antes de la mudanza',
    bodyEs:
      'Ana se muda a un apartamento nuevo en Santiago de Chile el sábado. Necesita empacar todas sus cosas. Necesita llamar a la empresa de mudanzas. También necesita limpiar el apartamento viejo. Su hermano le pregunta: "¿Necesitas ayuda?" "Sí," dice Ana. "Necesito ayuda con los muebles grandes." Su hermano necesita trabajar el viernes, pero el sábado puede ayudar. "Necesitamos comer algo también," dice él. "No podemos trabajar sin energía." Ana ríe. "Tienes razón. Necesitamos comer bien antes de la mudanza." Juntos pueden organizar todo perfectamente.',
    bodyEn:
      'Ana is moving to a new apartment in Santiago de Chile on Saturday. She needs to pack all her things. She needs to call the moving company. She also needs to clean the old apartment. Her brother asks her: "Do you need help?" "Yes," says Ana. "I need help with the big furniture." Her brother needs to work on Friday, but on Saturday he can help. "We need to eat something too," he says. "We can\'t work without energy." Ana laughs. "You\'re right. We need to eat well before the move." Together they can organize everything perfectly.',
    questions: [
      {
        questionEn: 'When does Ana\'s brother need to work?',
        answerEs: 'Necesita trabajar el viernes.',
        answerEn: 'He needs to work on Friday.',
      },
      {
        questionEn: 'What does Ana need help with from her brother?',
        answerEs: 'Necesita ayuda con los muebles grandes.',
        answerEn: 'She needs help with the big furniture.',
      },
    ],
  },
  {
    id: 11,
    patternId: 11,
    titleEn: 'A Tourist Asks for Directions in Seville',
    titleEs: 'Un turista pide direcciones en Sevilla',
    bodyEs:
      'James es un turista americano en Sevilla. Está un poco perdido cerca de la catedral. Ve a una señora mayor y le pregunta: "¿Dónde está el mercado de Triana?" La señora sonríe. "¿Cómo se llama usted?" pregunta ella primero. "James," responde él. "¿Por qué quiere ir al mercado?" pregunta la señora, curiosa. "Quiero comer comida local y comprar recuerdos." "¡Qué bien! ¿Cuándo quiere ir?" "Ahora mismo." La señora le explica el camino claramente. "¿Quién le recomendó Sevilla?" pregunta finalmente. "Un amigo," dice James. "¿Cuándo puedo volver aquí?" La señora ríe. "¡Siempre!"',
    bodyEn:
      'James is an American tourist in Seville. He is a bit lost near the cathedral. He sees an older woman and asks her: "Where is the Triana market?" The woman smiles. "What is your name?" she asks first. "James," he responds. "Why do you want to go to the market?" asks the woman, curious. "I want to eat local food and buy souvenirs." "How nice! When do you want to go?" "Right now." The woman explains the way clearly. "Who recommended Seville to you?" she finally asks. "A friend," says James. "When can I come back here?" The woman laughs. "Always!"',
    questions: [
      {
        questionEn: 'Where does James want to go?',
        answerEs: 'Quiere ir al mercado de Triana.',
        answerEn: 'He wants to go to the Triana market.',
      },
      {
        questionEn: 'Why does James want to go to the market?',
        answerEs: 'Quiere comer comida local y comprar recuerdos.',
        answerEn: 'He wants to eat local food and buy souvenirs.',
      },
    ],
  },
  {
    id: 12,
    patternId: 12,
    titleEn: 'Declining a Party Invitation',
    titleEs: 'Rechazando una invitación a una fiesta',
    bodyEs:
      'Diego invita a su amiga Valentina a una fiesta el sábado. Valentina quiere ir, pero tiene muchos problemas. "No puedo ir el sábado," dice ella. "No estoy bien. No quiero salir de casa." Diego pregunta: "¿No quieres ver a tus amigos?" "No, no quiero nada esta semana. No hablo con nadie cuando estoy cansada." Diego entiende. "No es un problema. No necesitas venir." Valentina está agradecida. "No es que no quiero verte. Simplemente no puedo ahora." "No te preocupes," dice Diego. "No vamos a hablar de esto más." Valentina sonríe. No está completamente sola — tiene un buen amigo.',
    bodyEn:
      'Diego invites his friend Valentina to a party on Saturday. Valentina wants to go, but she has many problems. "I can\'t go on Saturday," she says. "I\'m not feeling well. I don\'t want to leave the house." Diego asks: "Don\'t you want to see your friends?" "No, I don\'t want anything this week. I don\'t talk to anyone when I\'m tired." Diego understands. "It\'s not a problem. You don\'t need to come." Valentina is grateful. "It\'s not that I don\'t want to see you. I simply can\'t right now." "Don\'t worry," says Diego. "We\'re not going to talk about this anymore." Valentina smiles. She is not completely alone — she has a good friend.',
    questions: [
      {
        questionEn: 'Why can\'t Valentina go to the party?',
        answerEs: 'No está bien y no quiere salir de casa.',
        answerEn: 'She is not feeling well and does not want to leave the house.',
      },
      {
        questionEn: 'How does Diego respond to Valentina\'s refusal?',
        answerEs: 'Dice que no es un problema y que no necesita venir.',
        answerEn: 'He says it is not a problem and that she does not need to come.',
      },
    ],
  },
  {
    id: 13,
    patternId: 13,
    titleEn: 'Shopping at the Market in Oaxaca',
    titleEs: 'De compras en el mercado de Oaxaca',
    bodyEs:
      'El mercado Benito Juárez en Oaxaca es un lugar extraordinario. Las flores son de todos los colores — las rojas, las amarillas, las moradas. Los vendedores ofrecen las frutas más frescas: los mangos, las papayas, los aguacates. Una señora vende los quesos locales más famosos. Un hombre toca los instrumentos tradicionales — la música llena el aire. Las conversaciones entre los vendedores y los clientes son animadas y divertidas. Una turista compra un libro sobre la cultura local y una bolsa de cuero. El mercado es la ciudad en miniatura: los olores, los sonidos, los colores, la vida.',
    bodyEn:
      'The Benito Juárez market in Oaxaca is an extraordinary place. The flowers are all colors — red, yellow, purple. The vendors offer the freshest fruits: mangoes, papayas, avocados. A woman sells the most famous local cheeses. A man plays traditional instruments — music fills the air. The conversations between vendors and customers are lively and fun. A tourist buys a book about local culture and a leather bag. The market is the city in miniature: the smells, the sounds, the colors, the life.',
    questions: [
      {
        questionEn: 'What does the tourist buy at the market?',
        answerEs: 'Compra un libro sobre la cultura local y una bolsa de cuero.',
        answerEn: 'She buys a book about local culture and a leather bag.',
      },
      {
        questionEn: 'How are the conversations between vendors and customers described?',
        answerEs: 'Son animadas y divertidas.',
        answerEn: 'They are lively and fun.',
      },
    ],
  },
  {
    id: 14,
    patternId: 14,
    titleEn: 'A Doctor\'s Important Treatment',
    titleEs: 'El tratamiento importante de un médico',
    bodyEs:
      'La doctora Fuentes trabaja en un hospital en Lima, Perú. Hoy tiene un caso difícil. Un paciente necesita un tratamiento especial. Ella revisa el documento médico con cuidado. "Este es un momento crítico," dice a su equipo. "Necesitamos el instrumento quirúrgico del departamento tres." Su asistente busca el documento original del paciente. La doctora explica el argumento médico con calma. "El movimiento del paciente es un indicador importante." El apartamento del hospital está equipado para este tipo de tratamiento. La doctora trabaja con precisión total. Este momento es decisivo para el paciente.',
    bodyEn:
      'Dr. Fuentes works at a hospital in Lima, Peru. Today she has a difficult case. A patient needs a special treatment. She carefully reviews the medical document. "This is a critical moment," she says to her team. "We need the surgical instrument from department three." Her assistant looks for the patient\'s original document. The doctor explains the medical argument calmly. "The patient\'s movement is an important indicator." The hospital\'s department is equipped for this type of treatment. The doctor works with total precision. This moment is decisive for the patient.',
    questions: [
      {
        questionEn: 'What does the doctor\'s team need from department three?',
        answerEs: 'Necesitan el instrumento quirúrgico.',
        answerEn: 'They need the surgical instrument.',
      },
      {
        questionEn: 'What does the doctor call a critical moment?',
        answerEs: 'El tratamiento del paciente es un momento crítico.',
        answerEn: 'The patient\'s treatment is a critical moment.',
      },
    ],
  },
  {
    id: 15,
    patternId: 15,
    titleEn: 'A First Conversation Entirely in Spanish',
    titleEs: 'Una primera conversación totalmente en español',
    bodyEs:
      'Marco es americano. Estudia español hace seis meses. Hoy está en un café en Madrid y decide hablar en español con la mesera. "Buenos días. ¿Qué quiere tomar?" pregunta ella. "Quiero un café, por favor. ¿Puedo comer algo también?" "Claro. Tenemos un desayuno natural y delicioso." Marco entiende todo. No necesita hablar inglés. La conversación es simple pero real. "¿Dónde vive usted?" pregunta la mesera, curiosa. "Normalmente vivo en Nueva York, pero ahora estoy aquí un mes." Ella sonríe. "¡Habla español perfectamente!" Marco no es famoso, no es especial — pero en este momento, está absolutamente feliz.',
    bodyEn:
      'Marco is American. He has been studying Spanish for six months. Today he is at a café in Madrid and decides to speak in Spanish with the server. "Good morning. What would you like to drink?" she asks. "I want a coffee, please. Can I eat something too?" "Of course. We have a natural and delicious breakfast." Marco understands everything. He does not need to speak English. The conversation is simple but real. "Where do you live?" the server asks, curious. "Normally I live in New York, but right now I am here for a month." She smiles. "You speak Spanish perfectly!" Marco is not famous, not special — but in this moment, he is absolutely happy.',
    questions: [
      {
        questionEn: 'How long has Marco been studying Spanish?',
        answerEs: 'Estudia español hace seis meses.',
        answerEn: 'He has been studying Spanish for six months.',
      },
      {
        questionEn: 'How does Marco feel at the end of the conversation?',
        answerEs: 'Está absolutamente feliz.',
        answerEn: 'He is absolutely happy.',
      },
    ],
  },
];
