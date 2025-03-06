const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Cargar credenciales desde las variables de entorno en GitHub Actions
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://apptareasfamiliavd-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const messaging = admin.messaging();

async function enviarNotificaciones() {
  try {
    const snapshot = await admin.database().ref('tareas').once('value');
    const tareas = snapshot.val();
    if (!tareas) return;

    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() + 15); // Notificar 15 minutos antes
    const horaNotificacion = ahora.toTimeString().slice(0, 5);
    const fechaNotificacion = ahora.toISOString().split('T')[0];

    for (const [id, tarea] of Object.entries(tareas)) {
      if (tarea.completed) continue;
      if (tarea.date === fechaNotificacion && tarea.time === horaNotificacion) {
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

        await messaging.sendEachForMulticast(message);
        console.log(`✅ Notificación enviada para la tarea: ${tarea.text}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Error enviando notificaciones:', error);
  }
}

enviarNotificaciones();

