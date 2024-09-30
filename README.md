
# Morpion Multijoueur (Tic-Tac-Toe)

Back-project : create a game with server connexions (socket.io) linked to a database (mongodb)

## Installation

Dowlondoad all the project.

Install all the dependendcies and launch the project with npm start

```node
  npm i pug express socket.io body-parser bcrypt nodemon mongodb
```

## MongoDB
    Connect to MongoDb Compass (localhost) and create the following DataBase: 
    Database Name: morpion
    Collection Name: users

    Add the following data : ADD DATA > Import JSON > copy/paste :

    [
        { "_id": {
      "$oid": "66f553112454ce500fe28edb"
    },
    "username": "sugg",
    "password": "$2b$10$qWqnTVuh6oOuWM2e.GaB8OL2iulIPccEn1WnBgvwFNroJ5fKGNDZi",
    "score": 8},
    {"_id": {
      "$oid": "66f557122454ce500fe28edf"
    },
    "username": "toto",
    "password": "$2b$10$phiSeNMjH7Vf/rcXdmOoWOdTBwEoeX0lx/ePfL2Vp8zB07JqdTbNi",
    "score": 4},
    {
    "_id": {
      "$oid": "66f6893810c76effdc907295"
    },
    "username": "titi",
    "password": "$2b$10$LiG8qhAO3ajykXG4DFC5luQkSwSqY.C9AA1wDqkDTspTS9WBq3FUu",
    "score": 9
    }
    ]
------------
SheetCheat - passwords:
- sugg - 123456
- toto - toto
- titi - titi

-----------

## Demo

Let's play : 
http://localhost:1215/


## Author

- [su-gg](https://github.com/su-gg/morpion_multijoueur)

