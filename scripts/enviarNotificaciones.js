const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Leer las credenciales desde el archivo serviceAccount.json
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');

console.log("Contenido de serviceAccount.json:", serviceAccountContent); // TEMPORAL para depuración

const serviceAccount = JSON.parse(serviceAccountContent);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://apptareasfamiliavd-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const messaging = admin.messaging();

async function enviarNotificaciones() {
  try {
    console.log('Consultando tareas...');
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();
    
    if (!tareas) {
      console.log('No hay tareas');
      return;
    }

    console.log('Tareas obtenidas:', tareas);
    const ahora = moment().tz('America/Bogota');  // Usa la zona horaria correcta
    const horaActual = ahora.format('HH:mm');
    const fechaActual = ahora.format('YYYY-MM-DD');
    const horaLimite = ahora.add(15, 'minutes').format('HH:mm');

    console.log('Hora actual:', horaActual);
    console.log('Hora límite para la notificación:', horaLimite);

    for (const [id, tarea] of Object.entries(tareas)) {
      console.log('Revisando tarea:', tarea.text);

      if (tarea.completed) {
        console.log('Tarea ya completada:', tarea.text);
        continue;
      }

      // Verifica que la tarea esté dentro del rango de tiempo
      console.log('Fecha y hora actuales:', fechaActual, horaActual, horaLimite);
      console.log('Tarea:', tarea.date, tarea.time);

      if (tarea.date === fechaActual && tarea.time >= horaActual && tarea.time <= horaLimite) {
        console.log(`¡Es hora de enviar la notificación para: ${tarea.text}!`);

        const userRef = db.collection('users').doc(tarea.createdBy);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          console.log('No se encontró el usuario:', tarea.createdBy);
          continue;
        }

        const { tokens } = userSnap.data();
        console.log('Tokens de usuario:', tokens);
        if (!tokens || tokens.length === 0) {
          console.log('No hay tokens de notificación para el usuario:', tarea.createdBy);
          continue;
        }

        const message = {
          notification: {
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
          },
          tokens: tokens
        };

        try {
          console.log("Enviando mensaje:", message);
          const response = await messaging.sendMulticast(message);
          console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`, response);
        } catch (error) {
          console.error('Error al enviar notificación:', error);
        }
      } else {
        console.log('No es la hora para enviar la notificación de la tarea:', tarea.text);
      }
    }
  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
  }
}

enviarNotificaciones();



