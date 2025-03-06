const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer las credenciales desde el archivo serviceAccount.json
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');

// Verificar el contenido de serviceAccount.json para depuración (debe eliminarse después)
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
    // Obtener las tareas de Realtime Database
    console.log("Consultando tareas...");
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();
    console.log("Tareas obtenidas:", tareas);
    
    if (!tareas) return;

    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() + 15); // Notificar 15 minutos antes
    const horaNotificacion = ahora.toTimeString().slice(0, 5);
    const fechaNotificacion = ahora.toISOString().split('T')[0];

    // Iterar sobre cada tarea
    for (const [id, tarea] of Object.entries(tareas)) {
      console.log(`Revisando tarea: ${tarea.text}`);
      
      // Si la tarea está completada, ignorar
      if (tarea.completed) {
        console.log(`Tarea completada: ${tarea.text}`);
        continue;
      }

      // Verificar si la fecha y hora coinciden
      if (tarea.date === fechaNotificacion && tarea.time === horaNotificacion) {
        console.log("Notificación programada para la tarea:", tarea.text);

        // Consultar el usuario asociado a la tarea
        const userRef = db.collection('users').doc(tarea.createdBy);
        console.log("Consultando datos del usuario:", tarea.createdBy);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          console.log(`Usuario no encontrado: ${tarea.createdBy}`);
          continue;
        }

        const { tokens } = userSnap.data();
        if (!tokens || tokens.length === 0) {
          console.log(`No hay tokens para el usuario: ${tarea.createdBy}`);
          continue;
        }

        console.log(`Enviando notificación a ${tokens.length} tokens para la tarea: ${tarea.text}`);
        
        // Enviar la notificación a los tokens
        const message = {
          notification: {
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
          },
          tokens: tokens // Usar todos los tokens del usuario
        };

        // Enviar notificaciones en paralelo utilizando Promise.all
        try {
          const response = await messaging.sendMulticast(message);
          console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`, response);
        } catch (error) {
          console.error('⚠️ Error enviando la notificación:', error);
        }
      } else {
        console.log("No es la hora para enviar la notificación.");
      }
    }
  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
  }
}

enviarNotificaciones();



