import app from './app.js';
import { getServerUrl } from './lib/serverUrl.js';

const port = Number(process.env.PORT) || 4000;
const host = '0.0.0.0';

app.listen(port, host, () => {
    console.log(`Server running on ${getServerUrl()} (port ${port})`);
});
