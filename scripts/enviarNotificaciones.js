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

    // Token de prueba que proporcionaste
    const token = "c5i5uzAdA6G167XXjdEsLY:APA91bGo-Tpkp5jyk7KAdydlXbfae_ynZO_lAUt9ArGJcOzSt4S2KmprulJyQsUrhWYqona2RzNGi_Vv-Fld0hEWgp8nP7WKgZXr1VsKzbbS3NPMntIzGao";

    console.log('Token de prueba:', token);

    // Recorremos todas las tareas
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
        console.log(`¡Es hora de enviar el mensaje para: ${tarea.text}!`);

        const message = {
          data: {  // Enviar solo datos, sin notificación predeterminada
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`,
            taskId: id,  // Puedes incluir información adicional si lo necesitas
          },
          token: token,  // Usamos el token proporcionado
        };

        try {
          console.log("Enviando mensaje:", message);
          const response = await messaging.send(message);
          console.log(`✅ Mensaje enviado para la tarea: ${tarea.text}`, response);
        } catch (error) {
          console.error('Error al enviar el mensaje:', error);
        }
      } else {
        console.log('No es la hora para enviar el mensaje de la tarea:', tarea.text);
      }
    }

    console.log('Proceso de notificaciones completado.');  // Mensaje al final del ciclo

  } catch (error) {
    console.error('⚠️ Error enviando mensajes:', error);
  }
}

enviarNotificaciones();


