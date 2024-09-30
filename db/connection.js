import { MongoClient } from "mongodb";

const url = "mongodb://127.0.0.1:27017";
const dbName = "morpion";

let db;

export async function connectToDB() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log("Connexion réussie à MongoDB");
    db = client.db(dbName);
  } catch (error) {
    console.error("Erreur lors de la connexion à MongoDB", error);
  }
}

export function getDB() {
  if (!db) {
    throw new Error("La base de données n'est pas encore connectée");
  }
  return db;
}
