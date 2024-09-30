document.addEventListener("DOMContentLoaded", () => {
  const gameBoard = document.getElementById("gameboard");
  const socket = io();
  const username = new URLSearchParams(window.location.search).get("username");
  socket.emit("joinGame", username);

  let currentPlayer = null;
  let myTurn = false;
  let board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
  const playerScores = document.getElementById("playerScores");

  // Fonction pour mettre à jour le statut
  function setStatusMessage(message) {
    const statusDisplay = document.getElementById("status");
    if (statusDisplay) {
      statusDisplay.textContent = message;
    } else {
      console.error("L'élément #status n'a pas été trouvé dans le DOM.");
    }
  }

  // Écoute l'événement de démarrage du jeu
  socket.on("startGame", (data) => {
    const { players, currentPlayer: firstPlayer } = data;
    currentPlayer = firstPlayer;
    updateScores(data.players);
    console.log("Le jeu commence avec le joueur :", currentPlayer);

    if (socket.id === currentPlayer) {
      myTurn = true;
      setStatusMessage("C'est à votre tour !");
    } else {
      setStatusMessage("En attente du tour de votre adversaire...");
    }
  });

  socket.on("updatePlayers", (players) => {
    updateScores(players);
  });

  // Gestion des mouvements du joueur
  if (gameBoard) {
    gameBoard.addEventListener("click", (event) => {
      if (!myTurn) return; // Ignorer les clics si ce n'est pas notre tour
      const cell = event.target;

      const row = cell.getAttribute("data-row");
      const col = cell.getAttribute("data-col");

      if (!row || !col || board[row][col] !== "") return; // Ignorer si la cellule est déjà remplie

      // Envoyer le coup au serveur
      socket.emit("makeMove", { row, col });
    });
  } else {
    console.error("gameBoard n'a pas été trouvé dans le DOM.");
  }

  socket.on("moveMade", (data) => {
    const { row, col, symbol } = data;

    // Mettre à jour le tableau local
    board[row][col] = symbol;

    // Mettre à jour l'affichage de la cellule
    const cell = gameBoard.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (cell) {
      cell.textContent = symbol; // Afficher le symbole dans la cellule
    }

    if (socket.id === currentPlayer) {
      myTurn = false;
      setStatusMessage("En attente du tour de votre adversaire...");
    } else {
      myTurn = true;
      setStatusMessage("C'est à votre tour !");
    }
  });

  // Écoute des changements de tour
  socket.on("changeTurn", (nextPlayer) => {
    currentPlayer = nextPlayer;

    if (socket.id === currentPlayer) {
      myTurn = true;
      setStatusMessage("C'est à votre tour !");
    } else {
      setStatusMessage("En attente du tour de votre adversaire...");
    }
  });

  socket.on("updateScores", (players) => {
    if (players && players.length > 0) {
      playerScores.innerHTML = ""; // Vider l'affichage précédent
      players.forEach((player) => {
        let scoreElement = document.getElementById(`score-${player.username}`);
        if (scoreElement) {
          // Si l'élément existe, mettre à jour le score
          scoreElement.textContent = `${player.username}: ${player.score || 0}`;
        } else {
          // Sinon, créer un nouvel élément pour ce joueur
          scoreElement = document.createElement("div");
          scoreElement.id = `score-${player.username}`; // Ajout d'un ID unique basé sur le nom d'utilisateur
          scoreElement.textContent = `${player.username}: ${player.score || 0}`;
          playerScores.appendChild(scoreElement);
        }
      });
    } else {
      playerScores.innerHTML = "Aucun joueur trouvé.";
    }
  });

  // Gérer la fin de la partie
  socket.on("gameOver", (data) => {
    const winner = data.winner;
    if (winner) {
      setStatusMessage(`${winner} a gagné la partie !`);
    } else {
      setStatusMessage("Match nul !");
    }
    myTurn = false;
  });

  // Écoute de l'événement de réinitialisation du tableau
  socket.on("resetBoard", () => {
    board = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];

    // Réinitialiser l'affichage du tableau
    const cells = gameBoard.querySelectorAll("[data-row][data-col]");
    cells.forEach((cell) => {
      cell.textContent = ""; // Vider chaque cellule
    });

    // Réinitialiser le statut
    myTurn = false;
    setStatusMessage(
      "Le jeu a été réinitialisé. En attente de nouveaux joueurs..."
    );
  });

  function updateScores(players) {
    playerScores.innerHTML = "";
    players.forEach((player) => {
      const scoreElement = document.createElement("div");
      scoreElement.textContent = `${player.username}: ${player.score || 0}`;
      playerScores.appendChild(scoreElement);
    });
  }
});
