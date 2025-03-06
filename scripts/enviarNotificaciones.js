import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import fetch from 'node-fetch';
import serviceAccount from '../config/serviceAccountKey.json';

// Inicializar Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://tu-proyecto.firebaseio.com', // Reemplázalo con tu URL de Realtime Database
});

const db = getDatabase();
const firestore = getFirestore();

// Función para obtener las tareas próximas a vencer
const obtenerTareasPendientes = async () => {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() + 15); // Buscar tareas que vencen en 15 min
  const horaLimite = ahora.toTimeString().slice(0, 5); // Formato HH:MM
  const fechaHoy = new Date().toISOString().split('T')[0];

  const snapshot = await db.ref('tareas').orderByChild('date').equalTo(fechaHoy).once('value');
  const tareas = [];
  snapshot.forEach(child => {
    const tarea = child.val();
    if (tarea.time === horaLimite && !tarea.completed) {
      tareas.push({ id: child.key, ...tarea });
    }
  });
  return tareas;
};

// Función para enviar notificaciones
const enviarNotificaciones = async () => {
  const tareas = await obtenerTareasPendientes();
  for (const tarea of tareas) {
    const userRef = firestore.collection('users').doc(tarea.createdBy);
    const userDoc = await userRef.get();
    if (!userDoc.exists) continue;
    
    const { tokens, userName } = userDoc.data();
    if (!tokens || tokens.length === 0) continue;

    const message = {
      notification: {
        title: `⏳ Tarea pendiente: ${tarea.text}`,
        body: `Hora límite: ${tarea.time}`,
      },
      tokens,
    };

    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=TU_SERVER_KEY`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log(`📢 Notificación enviada a ${userName}`);
  }
};

// Ejecutar el script
enviarNotificaciones().catch(console.error);
