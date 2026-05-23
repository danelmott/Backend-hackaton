import { askClaude } from "./src/lib/IA.service.js";

await askClaude("QUIERO AHORRAR PERO NO SE CUAL PRODUCTO ME CONVIENE ", 'CLIENTE').then((response) => {
  console.log("Respuesta de Claude:", response);
}).catch((error) => {
  console.error("Error al obtener respuesta de Claude:", error);
});