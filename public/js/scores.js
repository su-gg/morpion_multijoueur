// Route pour afficher les scores des joueurs
app.get("/scores", async (req, res) => {
  try {
    const db = getDB();
    const players = await db.collection("users").find({}).toArray(); // Récupérer tous les utilisateurs
    res.render("scores", { players }); // Rendre la vue avec les joueurs
  } catch (err) {
    console.log("Erreur lors de la récupération des scores : ", err);
    res.status(500).send("Erreur lors de la récupération des scores.");
  }
});
