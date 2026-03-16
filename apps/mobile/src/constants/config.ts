
// For development, we usually use the local IP of the machine
// You might need to change this to your machine's IP if testing on a physical device
const DEV_API_URL = 'http://10.90.154.72:3000'; 

export const CONFIG = {
  API_URL: DEV_API_URL,
  IMAGE_PROXY_URL: `${DEV_API_URL}/static/`,
  DEFAULT_TIMEOUT: 10000,
};
