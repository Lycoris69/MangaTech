// Configuration de l'application
const config = {
  // Pour tester avec Expo sur votre téléphone, utilisez l'IP de votre machine
  // Trouvez votre IP avec: ip addr show (Linux) ou ifconfig (macOS)
  // Exemple: 'http://192.168.1.10:3000/api'
  
  // Pour l'émulateur Android, utilisez: 'http://10.0.2.2:3000/api'
  // Pour l'émulateur iOS, utilisez: 'http://localhost:3000/api'
  // Pour un appareil physique, utilisez votre IP locale
  
  API_URL: __DEV__ 
    ? 'http://10.187.247.179:3000/api'  // IP locale pour tester sur appareil physique
    : 'http://10.187.247.179:3000/api',
};

export default config;
