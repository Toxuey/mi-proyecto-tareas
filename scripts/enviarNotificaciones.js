const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Leer las credenciales desde el archivo serviceAccount.json
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://apptareasfamiliavd-default-rtdb.firebaseio.com'
});

const messaging = admin.messaging();
const notificationKey = "APA91bEn2LDy4uoVjw7t-KhfWg3EzQQrL1cQoDIfXFYSdKwfetXdsaqI3nF5EePWuEhBVilcvH0bXND5a050wW1fwSGCtpOxaTpoZI7faSlMQoLUr-b9X7o";

async function enviarNotificaciones() {
  try {
    console.log('📌 Consultando tareas...');
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();

    if (!tareas) {
      console.log('✅ No hay tareas pendientes.');
      process.exit(0);
      return;
    }

    const ahora = moment().tz('America/Bogota');
    const horaActual = ahora.format('HH:mm');
    const fechaActual = ahora.format('YYYY-MM-DD');
    const horaLimite = ahora.clone().add(1, 'hour').format('HH:mm');

    console.log(`🕒 Hora actual: ${horaActual} | Notificación hasta: ${horaLimite}`);

    const tareasFiltradas = Object.values(tareas).filter(tarea => 
      !tarea.completed && tarea.date === fechaActual && tarea.time >= horaActual && tarea.time <= horaLimite
    );

    if (tareasFiltradas.length === 0) {
      console.log('✅ No hay tareas próximas a vencer.');
      process.exit(0);
      return;
    }

    console.log(`🚀 Se enviarán ${tareasFiltradas.length} notificaciones.`);

    const mensajes = tareasFiltradas.map(tarea => ({
      data: {
        title: 'Recordatorio de tarea',
        body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
      },
      token: notificationKey
    }));

    const responses = await Promise.all(mensajes.map(msg => messaging.send(msg)));

    console.log(`✅ Se enviaron ${responses.length} notificaciones con éxito.`);
    process.exit(0);

  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
    process.exit(1);
  }
}

enviarNotificaciones();
