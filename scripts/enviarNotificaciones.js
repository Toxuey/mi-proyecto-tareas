const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Leer las credenciales desde el archivo serviceAccount.json
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(serviceAccountContent);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://apptareasfamiliavd-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const messaging = admin.messaging();

// Notification Key del grupo de dispositivos
const notificationKey = "APA91bEn2LDy4uoVjw7t-KhfWg3EzQQrL1cQoDIfXFYSdKwfetXdsaqI3nF5EePWuEhBVilcvH0bXND5a050wW1fwSGCtpOxaTpoZI7faSlMQoLUr-b9X7o";

async function enviarNotificaciones() {
  try {
    console.log('Consultando tareas...');
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();
    
    if (!tareas) {
      console.log('No hay tareas');
      process.exit(0);
      return;
    }

    console.log('Tareas obtenidas:', tareas);
    const ahora = moment().tz('America/Bogota');
    const horaActual = ahora.format('HH:mm');
    const fechaActual = ahora.format('YYYY-MM-DD');
    const horaLimite = ahora.add(1, 'hour').format('HH:mm'); // Ahora verifica tareas que vencen en 1 hora

    console.log('Hora actual:', horaActual);
    console.log('Hora límite para la notificación:', horaLimite);

    let notificacionesEnviadas = 0;

    for (const [id, tarea] of Object.entries(tareas)) {
      console.log('Revisando tarea:', tarea.text);

      if (tarea.completed) {
        console.log('Tarea ya completada:', tarea.text);
        continue;
      }

      console.log('Fecha y hora actuales:', fechaActual, horaActual, horaLimite);
      console.log('Tarea:', tarea.date, tarea.time);

      // Enviar notificación si la tarea vence dentro de la próxima hora
      if (tarea.date === fechaActual && tarea.time >= horaActual && tarea.time <= horaLimite) {
        console.log(`¡Es hora de enviar la notificación para: ${tarea.text}!`);

        const message = {
          data: {
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
          },
          token: notificationKey
        };

        try {
          console.log("Enviando mensaje:", message);
          const response = await messaging.send(message);
          console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`, response);
          notificacionesEnviadas++;
        } catch (error) {
          console.error('Error al enviar notificación:', error);
        }
      } else {
        console.log('No es la hora para enviar la notificación de la tarea:', tarea.text);
      }
    }

    if (notificacionesEnviadas > 0) {
      console.log(`Proceso de notificaciones completado. Se enviaron ${notificacionesEnviadas} notificaciones.`);
    } else {
      console.log('No se enviaron notificaciones.');
    }

    process.exit(0);

  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
    process.exit(1);
  }
}

enviarNotificaciones();

