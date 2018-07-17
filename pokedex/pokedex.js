// Name: Yuxin Jiang
// Date: 5/17/2018
// Section: CSE 154 AJ
//
// This is the javascript file pokedex. A Pokedex is an encyclopedia
// of different Pokemon species, representing each Pokemon as a small
// "sprite" image. A Pokedex entry will link directly to a Pokemon card,
// which is a card of information for a single Pokemon species, containing
// a larger image of the Pokemon, its type and weakness information, its
// set of moves, health point data, and a short description. Client will
// also be able to let two pokemon battle with each other.
//

"use strict";
(function() {
  // Game's id
  let guid = "";
  // Player's id
  let pid = "";
  // the pokemon's original health
  let originalHP = 0;
  // player's pokemon collection.
  let pokemonFound = ["Bulbasaur", "Charmander", "Squirtle"];
  // base URL for pokedex
  const POKEDEX_URL = "https://webster.cs.washington.edu/pokedex/";
  // base URL for battle
  const GAME_URL = "https://webster.cs.washington.edu/pokedex/game.php";

  /**
    * called when page loads; sets up the pokedex and
    *  relavent event handlers.
    */
  window.onload = function() {
    mainView();
    $("start-btn").onclick = battleStart;
    $("flee-btn").onclick = makeMove;
  };

  /**
    * called when the user clicked the "choose this pokemon" button.
    * this method switches the page to pokemon battle mode, and uses
    * ajax to fetch an opponent from the server.
    */
  function battleStart() {
    $("title").innerHTML = "Pokemon Battle Mode!";
    $("p2-turn-results").classList.remove("hidden");
    $("p1-turn-results").innerHTML = "";
    $("p2-turn-results").innerHTML = "";
    switchState();
    let buttons = document.querySelectorAll(".moves button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
    $("flee-btn").disabled = false;
    let data = new FormData();
    data.append("startgame", true);
    data.append("mypokemon", qs("#my-card .name").innerHTML);
    fetch(GAME_URL, {method: "POST", body: data, mode: 'cors'})
      .then(checkStatus)
      .then(JSON.parse)
      .then(showPokemon)
      .catch(catchError);

    let myMoves = qs("#my-card .moves").children;
    for (let i = 0; i < myMoves.length; i++) {
      myMoves[i].onclick = makeMove;
    }
  }

  /**
    * called when the user chooses one of the moves. This method uses ajax
    * to fetch the result state after the user has chosen of the moves.
    */
  function makeMove() {
    let data =  new FormData();
    data.append("guid", guid);
    data.append("pid", pid);
    let movename = "";
    if (this.id === "flee-btn") {
      movename = "flee";
    } else {
      movename = this.children[0].innerHTML.toLowerCase().replace(/\s/g, "");
    }
    data.append("movename", movename);
    $("loading").classList.remove("hidden");
    fetch(GAME_URL, {method: "POST", body: data, mode: 'cors'})
      .then(checkStatus)
      .then(JSON.parse)
      .then(moveResult)
      .catch(catchError);
  }

  /**
    * use the data from server to update the game battle state, including
    * buffs, health, win or lose, etc. If one of the pokemon's hp goes to 0,
    * a "back to pokedex" button will appear, and all the other buttons will
    * be disabled.
    * @param {object} moveData the responseText get from the server.
    */
  function moveResult(moveData) {
    let gameOver = false;
    $("p1-turn-results").innerHTML = "Player 1 played " + moveData.results["p1-move"] +
      " and " + moveData.results["p1-result"] + "!";
    $("p2-turn-results").innerHTML = "Player 2 played " + moveData.results["p2-move"] +
      " and " + moveData.results["p2-result"] + "!";
    if (moveData.results["p1-move"] === "flee") {
      updateHP("#my-card", 0, moveData.p1.hp);
      $("p2-turn-results").classList.add("hidden");
      $("title").innerHTML = "You lost!";
      gameOver = true;
    } else {
      let myHP = moveData.p1["current-hp"];
      let theirHP = moveData.p2["current-hp"];
      updateHP("#their-card", theirHP, moveData.p2.hp);
      updateHP("#my-card", myHP, moveData.p1.hp);
      updateBuff("#their-card", moveData.p2.buffs, moveData.p2.debuffs);
      updateBuff("#my-card", moveData.p1.buffs, moveData.p1.debuffs);
      if (theirHP === 0) {
        $("title").innerHTML = "You won!";
        $("p2-turn-results").classList.add("hidden");
        $(moveData.p2.name).classList.add("found");
        $(moveData.p2.name).onclick = choosePokemon;
        gameOver = true;
      } else if (myHP === 0) {
        $("title").innerHTML = "You lost!";
        gameOver = true;
      }
    }

    if (gameOver) {
      let buttons = document.querySelectorAll(".moves button");
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
      }
      $("flee-btn").disabled = true;
      $("endgame").classList.remove("hidden");
      $("endgame").onclick = backToPokedex;
    }

    $("loading").classList.add("hidden");
  }

  /**
    * called when the "back to pokedex" button is clicked and switches the
    * page to the pokedex mode.
    */
  function backToPokedex() {
    emtpyBuffs("#my-card");
    emtpyBuffs("#their-card");
    $("endgame").classList.add("hidden");
    $("p2-turn-results").classList.add("hidden");
    $("title").innerHTML = "Your Pokedex";
    switchState();
    updateHP("#my-card", originalHP, originalHP);
  }

  /**
    * helper method to switch between pokedex mode and
    * battle mode in order to remove redundency.
    */
  function switchState() {
    $("results-container").classList.toggle("hidden");
    $("their-card").classList.toggle("hidden");
    $("start-btn").classList.toggle("hidden");
    $("flee-btn").classList.toggle("hidden");
    $("pokedex-view").classList.toggle("hidden");
    $("p1-turn-results").classList.toggle("hidden");
    qs("#my-card .hp-info").classList.toggle("hidden");
    qs("#my-card .buffs").classList.toggle("hidden");
  }

  /**
    * update the health of the pokemon according to the information given.
    * @param {object} card - the current card that will be modified
    * @param {number} currentHP - the current health of the pokemon
    * @param {number} maxHP - the max health of the pokemon
    */
  function updateHP(card, currentHP, maxHP) {
    qs(card + " .hp").innerHTML = currentHP + "HP";
    let hpBar = qs(card + " .health-bar");
    let percentHP = (currentHP / maxHP) * 100;
    hpBar.style.width = percentHP + "%";
    if (percentHP < 20) {
      hpBar.classList.add("low-health");
    } else {
      hpBar.classList.remove("low-health");
    }
  }

  /**
    * update the buffs of the pokemon according to the information given.
    * @param {object} card - the current card that will be modified
    * @param {object} buffs - the current buffs of the pokemon
    * @param {object} debuffs - the current debuffs of the pokemon
    */
  function updateBuff(card, buffs, debuffs) {
    emtpyBuffs(card);
    let cardBuff = qs(card + " .buffs");
    for (let i = 0; i < buffs.length; i++) {
      let buffChild = document.createElement("div");
      buffChild.classList.add("buff", buffs[i]);
      cardBuff.appendChild(buffChild);
    }
    for (let i = 0; i < debuffs.length; i++) {
      let buffChild = document.createElement("div");
      buffChild.classList.add("debuff", debuffs[i]);
      cardBuff.appendChild(buffChild);
    }
  }

  /**
    * clear the buffs of the pokemon.
    * @param {object} card - the current card that will be modified
    */
  function emtpyBuffs(card) {
    let cardBuff = qs(card + " .buffs");
    let buffChildren = cardBuff.children;
    let length = buffChildren.length;
    for (let i = 0; i < length; i++) {
      buffChildren[0].parentNode.removeChild(buffChildren[0]);
    }
  }

  /**
    * get the data from server and set up the pokedex.
    */
  function mainView() {
    let url = POKEDEX_URL + "pokedex.php?pokedex=all";
    fetch(url, {mode: 'cors'})
      .then(checkStatus)
      .then(showPokedex)
      .catch(catchError);
  }

  /**
    * use the data from server to set up the pokedex.
    * @param {string} responseText - the responseText get from the server.
    */
  function showPokedex(responseText) {
    let pokedex = responseText.split("\n");
    for (let i = 0; i < 151; i++) {
      let pokemon = pokedex[i].split(":");
      let pokemonImg = document.createElement("img");
      pokemonImg.id = pokemon[0];
      pokemonImg.src = POKEDEX_URL + "sprites/" + pokemon[1];
      pokemonImg.classList.add("sprite");
      if (pokemonFound.indexOf(pokemon[0]) != -1) {
        pokemonImg.classList.add("found");
        pokemonImg.onclick = choosePokemon;
      }
      $("pokedex-view").appendChild(pokemonImg);
    }
  }

  /**
    * helper method to call the showCard method with parameter.
    */
  function choosePokemon() {
    showCard(this.id);
  }

  /**
    * get the selected pokeman's info from the server and set up the card.
    * @param {string} pokemon - the name of the pokemon
    */
  function showCard(pokemon) {
    let url = POKEDEX_URL + "pokedex.php?pokemon=" + pokemon;
    fetch(url, {mode: 'cors'})
      .then(checkStatus)
      .then(JSON.parse)
      .then(showPokemon)
      .catch(catchError);
    $("start-btn").classList.remove("hidden");
  }

  /**
    * use the data from server to set up the pokeman card.
    * @param {object} responseText - the responseText get from the server.
    */
  function showPokemon(responseText) {
    let card = "#my-card";
    if (responseText.p2) {
      guid = responseText.guid;
      pid = responseText.pid;
      responseText = responseText.p2;
      card = "#their-card";
    }
    let name = responseText.name;
    qs(card + " .name").innerHTML = name;
    let photo = responseText.images.photo;
    qs(card + " .pokepic").src = POKEDEX_URL + photo;
    let typeIcon = responseText.images.typeIcon;
    qs(card + " .type").src = POKEDEX_URL + typeIcon;
    let weaknessIcon = responseText.images.weaknessIcon;
    qs(card + " .weakness").src = POKEDEX_URL + weaknessIcon;
    let description = responseText.info.description;
    qs(card + " .info").innerHTML = description;
    showMoves(card, responseText.moves);
    if (card === "#my-card") {
      originalHP = responseText.hp;
    }
    updateHP(card, responseText.hp, responseText.hp);
  }

  /**
    * helper method to set up the moves on the pokemon card.
    * @param {object} card - the current card that will be modified
    * @param {object} moves - all the moves of a particular pokemon.
    */
  function showMoves(card, moves) {
    let maxMoves = qs(card + " .moves").children;
    for (let i = 0; i < 4; i++) {
      maxMoves[i].classList.remove("hidden");
    }
    for (let i = 0; i < moves.length; i++) {
      let currentMove = maxMoves[i].children;
      let moveName = moves[i].name;
      currentMove[0].innerText = moveName;
      let moveType = moves[i].type;
      currentMove[1].innerHTML = "";
      currentMove[2].src = POKEDEX_URL + "icons/" + moveType + ".jpg";
      if (moves[i].dp) {
        currentMove[1].innerHTML = moves[i].dp + " DP";
      }
    }
    for (let i = moves.length; i < 4; i++) {
      maxMoves[i].classList.add("hidden");
    }
  }

  /**
    * print "error!" to the console when there is an error during ajax fetch.
    */
  function catchError() {
    console.log("error!");
  }

  /**
    * Function to check the status of an Ajax call, boiler plate code to include,
    * based on: https://developers.google.com/web/updates/2015/03/introduction-to-fetch
    * @param the response text from the url call
    * @return did we succeed or not, so we know whether or not to continue with the handling of
    * this promise
    */
  function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response.text();
    } else {
      return Promise.reject(new Error(response.status + ": " + response.statusText));
    }
  }

  /**
    * Helper function to get the element by its id
    * @param {string} id The string ID of the DOM element to retrieve
    * @return {object} the DOM element denoted by the ID given
    */
  function $(id) {
    return document.getElementById(id);
  }

  /**
    * Helper function to get the element using querySelector
    * @param {string} selector The selector string of the DOM element to retrieve
    * @return {object} the DOM element denoted by the selector given
    */
  function qs(selector) {
    return document.querySelector(selector);
  }
})();
