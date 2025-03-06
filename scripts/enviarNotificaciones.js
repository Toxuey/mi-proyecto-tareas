const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

async function enviarNotificaciones() {
  try {
    console.log('Consultando tareas...');
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();
    if (!tareas) return;

    console.log('Tareas obtenidas:', tareas);

    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0]; // Solo la fecha (YYYY-MM-DD)
    const horaActual = ahora.toTimeString().slice(0, 5); // Solo la hora (HH:MM)
    
    // Calcular la hora límite, es decir, 15 minutos después de la hora actual
    const ahoraLimite = new Date(ahora.getTime() + 15 * 60000); // 15 minutos después
    const horaLimite = ahoraLimite.toTimeString().slice(0, 5);

    console.log("Hora actual:", horaActual);
    console.log("Hora límite para la notificación:", horaLimite);

    // Recorremos las tareas
    for (const [id, tarea] of Object.entries(tareas)) {
      if (tarea.completed) continue; // Ignorar tareas completadas

      // Comprobar si la tarea está dentro del rango de tiempo (entre la hora actual y la hora límite)
      const tareaHora = tarea.time;
      const tareaFecha = tarea.date;

      if (tareaFecha === fechaActual && tareaHora >= horaActual && tareaHora <= horaLimite) {
        // Si la tarea está dentro del rango, enviamos la notificación
        const userRef = db.collection('users').doc(tarea.createdBy);
        const userSnap = await userRef.get();
        if (!userSnap.exists) continue;

        const { tokens } = userSnap.data();
        if (!tokens || tokens.length === 0) continue;

        const message = {
          notification: {
            title: 'Recordatorio de tarea',
            body: `Tienes pendiente: ${tarea.text} a las ${tarea.time}`
          },
          tokens: tokens
        };

        // Usar sendMulticast para enviar a varios tokens
        const response = await messaging.sendMulticast(message);
        console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`, response);
      } else {
        console.log(`No es la hora para enviar la notificación de la tarea: ${tarea.text}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
  }
}

enviarNotificaciones();


