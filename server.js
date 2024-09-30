import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { connectToDB, getDB } from "./db/connection.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 1215;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Nombre de salages pour le hachage bcrypt
const SALT_ROUNDS = 10;

// Connexion à la base de données
connectToDB().then(() => {
  const db = getDB();

  // Route de la page d'accueil
  app.get("/", (req, res) => {
    res.render("index");
  });

  // Route de la page scores
  app.get("/scores", async (req, res) => {
    try {
      const db = getDB();
      let players = await db.collection("users").find({}).toArray();

      if (!players) {
        players = []; // Si aucun joueur n'est trouvé, on retourne un tableau vide
      }

      res.render("scores", { players }); // Rendre la vue avec les joueurs
    } catch (err) {
      console.log("Erreur lors de la récupération des scores : ", err);
      res.status(500).send("Erreur lors de la récupération des scores.");
    }
  });

  // Route de création de compte
  app.get("/register", (req, res) => {
    res.render("register");
  });

  app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    console.log(
      "Requête de création de compte reçue avec les données : ",
      req.body
    );

    if (!username || !password) {
      console.log("Champs requis manquants. Username ou password est vide.");
      return res.redirect("/register");
    }

    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await db.collection("users").findOne({ username });
      if (existingUser) {
        console.log("L'utilisateur ${username} existe déjà.");
        return res.redirect("/register");
      }

      // Hacher le mot de passe avec bcrypt
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      console.log(
        "Mot de passe haché pour l'utilisateur ${username}: ${hashedPassword}"
      );

      // Insérer le nouvel utilisateur avec le mot de passe haché
      await db
        .collection("users")
        .insertOne({ username, password: hashedPassword, score: 0 });
      console.log(
        "Utilisateur ${username} enregistré avec succès dans la base de données."
      );
      res.redirect("/login");
    } catch (err) {
      console.log("Erreur lors de l'insertion : ", err);
      return res.redirect("/register");
    }
  });

  // Route de connexion
  app.get("/login", (req, res) => {
    res.render("login");
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    console.log("Requête de connexion reçue avec les données : ", req.body);

    if (!username || !password) {
      console.log("Champs requis manquants pour la connexion");
      return res.redirect("/login");
    }

    try {
      // Trouver l'utilisateur dans la base de données
      const user = await db.collection("users").findOne({ username });
      console.log("Utilisateur trouvé: ${JSON.stringify(user)}"); // Ajoutez cette ligne

      if (!user) {
        console.log("Utilisateur non trouvé");
        return res.redirect("/login");
      }

      // Comparer le mot de passe saisi avec le mot de passe haché stocké
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (isPasswordMatch) {
        if (players.find((p) => p.username === username)) {
          console.log("L'utilisateur ${username} est déjà connecté.");
          return res.redirect("/login");
        }
        console.log("Utilisateur ${username} connecté avec succès");
        res.redirect("/game?username=" + username);
      } else {
        console.log("Mot de passe incorrect");
        res.redirect("/login");
      }
    } catch (err) {
      console.log("Erreur lors de la vérification de l'utilisateur : ", err);
      return res.redirect("/login");
    }
  });

  // Route du jeu
  app.get("/game", (req, res) => {
    const username = req.query.username;

    if (!username) {
      console.log("Nom d'utilisateur manquant dans la requête");
      return res.redirect("/login");
    }
    res.render("game", { username });
  });

  let players = [];
  let currentPlayer = null;
  let symbols = ["X", "O"]; // Symboles pour les deux joueurs

  let board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];

  // Connexion joueur :
  io.on("connection", (socket) => {
    console.log("Un utilisateur s'est connecté :", socket.id);

    // Gestion de l'événement 'joinGame'
    socket.on("joinGame", async (username) => {
      console.log(`${username} a rejoint le jeu avec l'ID: ${socket.id}`);

      if (players.length < 2) {
        const playerSymbol = symbols[players.length];
        players.push({ id: socket.id, username, symbol: playerSymbol });

        const user = await db.collection("users").findOne({ username });
        socket.emit("updateScores", [{ username, score: user.score }]); // Correction de l'envoi de score

        io.emit("updatePlayers", players);

        if (players.length === 2) {
          currentPlayer = players[0].id;
          io.emit("startGame", { players, currentPlayer });
          console.log("Deux joueurs sont connectés. Le jeu commence !");
        }
      } else {
        console.log(
          "Le jeu est plein, un joueur supplémentaire a essayé de rejoindre."
        );
        socket.emit("gameFull");
      }
    });

    socket.on("makeMove", async (data) => {
      console.log("Coup joué:", data);
      const { row, col } = data;

      const player = players.find((p) => p.id === socket.id);

      if (socket.id === currentPlayer && board[row][col] === "") {
        board[row][col] = player.symbol;

        io.emit("moveMade", { row, col, symbol: player.symbol });

        if (checkWinner(player.symbol)) {
          await updateScores(player.username, 1); // Increment score for winner
          const updatedScores = await db.collection("users").find({}).toArray(); // Retrieve updated scores
          io.emit("updateScores", updatedScores);
          io.emit("gameOver", { winner: player.username });
          resetBoard();
          return;
        }

        if (isBoardFull()) {
          io.emit("gameOver", { winner: null });
          resetBoard();
          return;
        }

        currentPlayer = players.find((p) => p.id !== currentPlayer).id;
        io.emit("changeTurn", currentPlayer);
      } else {
        console.log("Coup invalide, la cellule est déjà occupée.");
      }
    });

    // Récupération des scores lors de la fin de partie
    socket.on("playerWins", async (winnerUsername) => {
      console.log(`${winnerUsername} a gagné la partie !`);

      const user = await db
        .collection("users")
        .findOne({ username: winnerUsername });
      const newScore = (user.score || 0) + 1;
      await db
        .collection("users")
        .updateOne({ username: winnerUsername }, { $set: { score: newScore } });
    });

    // Gestion de la déconnexion d'un joueur
    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté :", socket.id);

      // Retirer le joueur du tableau des joueurs
      players = players.filter((player) => player.id !== socket.id);
      io.emit("updatePlayers", players); // Mise à jour des joueurs pour tous les clients

      // Si un joueur se déconnecte, arrêter le jeu
      if (players.length < 2) {
        io.emit("stopGame"); // Envoyer un signal pour arrêter le jeu
        resetBoard();
      }
    });
  });

  // Fonction pour vérifier le gagnant
  function checkWinner(symbol) {
    const winPatterns = [
      // Lignes
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      // Colonnes
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      // Diagonales
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ];

    // Vérifier chaque combinaison gagnante
    return winPatterns.some((pattern) =>
      pattern.every(([row, col]) => board[row][col] === symbol)
    );
  }

  // Fonction pour vérifier si le plateau est plein (match nul)
  function isBoardFull() {
    return board.flat().every((cell) => cell !== "");
  }

  function resetBoard() {
    board = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
  }

  async function updateScores(username, increment) {
    await db
      .collection("users")
      .updateOne({ username }, { $inc: { score: increment } });
  }

  // Démarrage du serveur
  server.listen(PORT, () => {
    console.log("Serveur lancé sur http://localhost:${PORT}");
  });
});
