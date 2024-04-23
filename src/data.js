import * as fs from "fs";
export function getDataFromLocalJson() {
  // Path to your local JSON file
  const filePath = "src/data.json";

  const raw = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
  const data = JSON.parse(raw);
  return data;
}

// const ENDPOINT_URL =
//   "https://image-affect.digitaldemocracies.org/api/affect-paths-with-images";
// const AUTH = "Basic YWRtaW46cGFzc3dvcmQzMDAw";

// export function getData() {
//   const myHeaders = new Headers();
//   myHeaders.append("Authorization", "Basic YWRtaW46cGFzc3dvcmQzMDAw");
//   myHeaders.append("Access-Control-Allow-Origin", "*");
//   myHeaders.append(
//     "Access-Control-Allow-Methods",
//     "GET, POST, PUT, DELETE, OPTIONS"
//   );

//   fetch(ENDPOINT_URL, {
//     method: "GET",
//     headers: myHeaders,
//     mode: "no-cors",
//     redirect: "follow",
//   }).then((response) => {
//     if (response.ok) {
//       return response.json();
//     } else {
//       console.log("Endpoint data error");
//     }
//   });
// }
// import axios from "axios";
// // Define custom headers
// const headers = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers": "*",
//   Authorization: "Basic YWRtaW46cGFzc3dvcmQzMDAw",

//   // Optional: Add any additional headers you need
// };

// axios
//   .get(ENDPOINT_URL, headers)
//   .then((response) => {
//     console.log(response.data);
//   })
//   .catch((error) => {
//     console.error(error);
//   });
