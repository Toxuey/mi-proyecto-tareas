const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Leer las credenciales desde el archivo serviceAccount.json
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');

// Depuración temporal para ver el contenido de serviceAccount.json
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
      process.exit(0);  // Termina el proceso si no hay tareas
      return;
    }

    console.log('Tareas obtenidas:', tareas);
    const ahora = moment().tz('America/Bogota');  // Usa la zona horaria correcta
    const horaActual = ahora.format('HH:mm');
    const fechaActual = ahora.format('YYYY-MM-DD');
    const horaLimite = ahora.add(15, 'minutes').format('HH:mm');

    console.log('Hora actual:', horaActual);
    console.log('Hora límite para la notificación:', horaLimite);

    // Token de prueba que proporcionaste
    const token = "c5i5uzAdA6G167XXjdEsLY:APA91bGo-Tpkp5jyk7KAdydlXbfae_ynZO_lAUt9ArGJcOzSt4S2KmprulJyQsUrhWYqona2RzNGi_Vv-Fld0hEWgp8nP7WKgZXr1VsKzbbS3NPMntIzGao";

    console.log('Token de prueba:', token);

    // Recorremos todas las tareas
    let notificacionesEnviadas = 0;  // Para llevar la cuenta de las notificaciones enviadas
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

        const message = {
          data: {  // Usamos data para evitar la notificación predeterminada
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
          },
          token: token  // Usamos el token proporcionado
        };

        try {
          console.log("Enviando mensaje:", message);
          const response = await messaging.send(message);
          console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`, response);
          notificacionesEnviadas++;  // Aumentamos el contador de notificaciones enviadas
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

    process.exit(0);  // Termina el proceso exitosamente

  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
    process.exit(1);  // Si hay error, termina el proceso con un código diferente
  }
}

enviarNotificaciones();


