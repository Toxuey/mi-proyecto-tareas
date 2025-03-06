const admin = require('firebase-admin');

// Inicialización de Firebase Admin con el archivo de credenciales
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

// Token de dispositivo de prueba
const registrationToken = 'c5i5uzAdA6G167XXjdEsLY:APA91bGo-Tpkp5jyk7KAdydlXbfae_ynZO_lAUt9ArGJcOzSt4S2KmprulJyQsUrhWYqona2RzNGi_Vv-Fld0hEWgp8nP7WKgZXr1VsKzbbS3NPMntIzGao';

// Configuración de la notificación
const message = {
  notification: {
    title: 'Notificación de prueba',
    body: '¡Hola! Este es un mensaje de prueba.',
  },
  token: registrationToken,  // Enviar solo a este dispositivo
};

// Enviar la notificación
messaging.send(message)
  .then((response) => {
    console.log('✅ Notificación enviada:', response);
  })
  .catch((error) => {
    console.error('⚠️ Error al enviar notificación:', error);
  });




