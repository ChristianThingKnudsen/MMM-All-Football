Module.register("MMM-All-Football", {
  // Default module config
  defaults: {
    leagues: ["PL"],
    showTables: true,
    showTopScorers: false,
    displayTime: 30 * 1000,
    width: 0,
    apiKey: "",
  },

  // Gets automatically called when the module starts
  loaded: function (callback) {
    this.finishLoading();
    callback();
  },

  // Gets automatically called when the module starts, library for changing dates in different formats
  getScripts: function () {
    return ["moment.js"];
  },

  // Gets automatically called when the module starts, contains style info
  getStyles: function () {
    return ["MMM-All-Football.css"];
  },

  getNow: function () {
    return moment().format("DD.MM.YY - HH:mm:ss");
  },

  // Gets automatically called when the module starts
  start: function () {
    this.logos = {};
    this.matches = {};
    this.topScorers = {};
    this.leagueNames = {};
    this.leagueLogos = {};
    this.tables = {};
    // Leauges
    this.currentLeagueIndex = 0;
    this.currentLeague = this.config.leagues[this.currentLeagueIndex];
    // Views
    this.currentViewIndex = 0;
    this.views = ["SHOW_MATCHES"];
    if (this.config.showTables) this.views.push("SHOW_TABLE");
    if (this.config.showTopScorers) this.views.push("SHOW_TOP_SCORERS");
    this.now = this.getNow();

    // Send our current config to node_helper, starting its polling
    this.sendSocketNotification("CONFIG", {
      leagues: this.config.leagues,
      showTables: this.config.showTables,
      showTopScorers: this.config.showTopScorers,
      apiKey: this.config.apiKey,
      id: this.identifier,
      displayTime: this.displayTime,
    });
  },

  // Changes league to the one specified by index, oly uses crawled indices
  changeLeague: function (self) {
    const config = self.config;
    var nextIndex = self.currentLeagueIndex + 1;

    if (nextIndex >= config.leagues.length) {
      // Reset the index to 0 if it exceeds the list length
      nextIndex = 0;
    }

    self.currentLeagueIndex = nextIndex;
    self.currentLeague = config.leagues[nextIndex];
  },
  getFormattedDate(date) {
    var monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      dayNames[date.getDay()] +
      " " +
      this.getOrdinalNum(date.getDate()) +
      " " +
      monthNames[date.getMonth()]
    );
  },

  getOrdinalNum(n) {
    return (
      n +
      (n > 0
        ? ["th", "st", "nd", "rd"][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10]
        : "")
    );
  },

  // Returns the View, gets called every updateTime by itself through setTimeout
  getDom: function () {
    // Create the base element
    var self = this;
    var wrapper = document.createElement("div");

    if (this.currentLeague === -1 || !this.matches[this.currentLeague]) {
      wrapper.innerHTML = "Loading...";

      setTimeout(function () {
        self.updateDom(1000);
      }, 2000);
      console.log("Waiting for Data...");
      return wrapper;
    }

    // Add fontawesome to html head, to use their icons
    var link = document.createElement("link");
    link.id = "id2";
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
    document.head.appendChild(link);

    // Check views. If exceeded, change league and reset view
    if (this.currentViewIndex >= this.views.length) {
      // Reset the index to 0 if it exceeds the list length
      this.currentViewIndex = 0;
      this.changeLeague(self);
    }

    switch (this.views[this.currentViewIndex]) {
      case "SHOW_MATCHES":
        if (this.matches[this.currentLeague]) {
          wrapper = this.renderMatches(wrapper);
        } else {
          wrapper.innerHTML = "ERROR: Matches League: " + this.currentLeague;
        }

        break;
      case "SHOW_TABLE":
        if (this.tables[this.currentLeague]) {
          wrapper = this.renderTable(wrapper);
        } else {
          wrapper.innerHTML = "ERROR: Table League: " + this.currentLeague;
        }
        break;
      case "SHOW_TOP_SCORERS":
        if (this.topScorers[this.currentLeague]) {
          wrapper = this.renderTopScorers(wrapper);
        } else {
          wrapper.innerHTML =
            "ERROR: Top Scorers League: " + this.currentLeague;
        }

        break;
      default:
        wrapper.innerHTML =
          "ERROR: Entered invalidate state: " +
          this.views[this.currentViewIndex];

        break;
    }
    this.currentViewIndex = this.currentViewIndex + 1;
    setTimeout(function () {
      self.updateDom(1000);
    }, this.config.displayTime);
    return wrapper;
  },
  renderTitle(wrapper) {
    var title = document.createElement("header");
    title.innerHTML =
      this.leagueNames[this.currentLeague] + " - Updated: " + this.now;
    title.setAttribute("width", "330px");
    wrapper.appendChild(title);
    return wrapper;
  },
  renderTable(wrapper) {
    //Create encapsuling div
    var div = document.createElement("div");
    if (this.config.width !== 0) div.style.width = this.config.width;
    wrapper.appendChild(div);
    wrapper = this.renderTitle(wrapper);

    // Create Table View
    var places = document.createElement("table");
    places.className = "xsmall";

    var labelRow = document.createElement("tr");
    labelRow.setAttribute("width", "330px");

    var position = document.createElement("th");
    position.setAttribute("width", "30px");
    labelRow.appendChild(position);

    //Check if we need a logo row
    var logo = document.createElement("th");
    logo.setAttribute("width", "30px");
    labelRow.appendChild(logo);

    var name = document.createElement("th");
    name.innerHTML = "TEAM";
    name.setAttribute("width", "180px");
    name.setAttribute("align", "left");
    labelRow.appendChild(name);

    var gamesLabel = document.createElement("th");
    var gamesLogo = document.createElement("i");
    gamesLogo.classList.add("fa", "fa-hashtag");
    gamesLabel.setAttribute("width", "30px");
    gamesLabel.appendChild(gamesLogo);
    labelRow.appendChild(gamesLabel);

    var goalsLabel = document.createElement("th");
    var goalslogo = document.createElement("i");
    goalslogo.classList.add("fa", "fa-soccer-ball-o");
    goalsLabel.appendChild(goalslogo);
    goalsLabel.setAttribute("width", "30px");
    labelRow.appendChild(goalsLabel);

    var pointsLabel = document.createElement("th");
    var pointslogo = document.createElement("i");
    pointslogo.classList.add("fa", "fa-line-chart");
    pointsLabel.setAttribute("width", "30px");
    pointsLabel.appendChild(pointslogo);
    labelRow.appendChild(pointsLabel);

    places.appendChild(labelRow);

    const table = this.tables[this.currentLeague];

    for (var i = 0; i < table.length; i++) {
      var place = document.createElement("tr");

      var number = document.createElement("td");
      number.innerHTML = i + 1;
      place.appendChild(number);

      var team_logo_cell = document.createElement("td");
      var team_logo_image = document.createElement("img");

      team_logo_image.className = "MMM-SoccerLiveScore-team_logo";
      team_logo_image.src = table[i].team.crest;
      team_logo_image.width = 20;
      team_logo_image.height = 20;
      team_logo_cell.appendChild(team_logo_image);
      place.appendChild(team_logo_cell);

      // names
      var team_name = document.createElement("td");
      team_name.setAttribute("align", "left");
      team_name.innerHTML = table[i].team.name;
      place.appendChild(team_name);

      var games = document.createElement("td");
      games.innerHTML = table[i].playedGames;
      place.appendChild(games);

      var goals = document.createElement("td");
      goals.innerHTML = table[i].goalDifference;
      place.appendChild(goals);

      var points = document.createElement("td");
      points.innerHTML = table[i].points;
      place.appendChild(points);

      places.appendChild(place);
    }

    wrapper.appendChild(places);
    return wrapper;
  },
  renderTopScorers(wrapper) {
    var div = document.createElement("div");
    if (this.config.width !== 0) div.style.width = this.config.width;
    wrapper.appendChild(div);
    wrapper = this.renderTitle(wrapper);

    // Create Table View

    var places = document.createElement("table");
    places.className = "xsmall";

    var labelRow = document.createElement("tr");
    labelRow.setAttribute("width", "330px");

    // Position column
    var position = document.createElement("th");
    position.setAttribute("width", "30px");
    labelRow.appendChild(position);

    // Logo column
    var logo = document.createElement("th");
    logo.setAttribute("width", "30px");
    labelRow.appendChild(logo);

    // Player name
    var name = document.createElement("th");
    name.innerHTML = "TOP SCORER";
    name.setAttribute("width", "180px");
    name.setAttribute("align", "left");
    labelRow.appendChild(name);

    // Goals column
    var goalsLabel = document.createElement("th");
    var goalslogo = document.createElement("i");
    goalslogo.classList.add("fa", "fa-soccer-ball-o");
    goalsLabel.appendChild(goalslogo);
    goalsLabel.setAttribute("width", "30px");
    labelRow.appendChild(goalsLabel);

    // Assists column
    var assistsLabel = document.createElement("th");
    var assistsLogo = document.createElement("i");
    assistsLogo.classList.add("fa", "fa-users");
    assistsLabel.setAttribute("width", "30px");
    assistsLabel.appendChild(assistsLogo);
    labelRow.appendChild(assistsLabel);

    // Games played column
    var gamesLabel = document.createElement("th");
    var gamesLogo = document.createElement("i");
    gamesLogo.classList.add("fa", "fa-hashtag");
    gamesLabel.setAttribute("width", "30px");
    gamesLabel.appendChild(gamesLogo);
    labelRow.appendChild(gamesLabel);

    // Add header row to table
    places.appendChild(labelRow);

    const topScorers = this.topScorers[this.currentLeague];
    for (var i = 0; i < topScorers.length; i++) {
      const topScorer = topScorers[i];

      // Add numeric position
      var place = document.createElement("tr");
      var number = document.createElement("td");
      number.innerHTML = i + 1;
      place.appendChild(number);

      // Team logo
      var team_logo_cell = document.createElement("td");
      var team_logo_image = document.createElement("img");
      team_logo_image.className = "MMM-SoccerLiveScore-team_logo";
      team_logo_image.src = topScorer.team.crest;
      team_logo_image.width = 20;
      team_logo_image.height = 20;
      team_logo_cell.appendChild(team_logo_image);
      place.appendChild(team_logo_cell);

      // Player name
      var player_name = document.createElement("td");
      player_name.setAttribute("align", "left");
      player_name.innerHTML = topScorer.player.name;
      place.appendChild(player_name);

      // Goals
      var goals = document.createElement("td");
      if (topScorer.goals) {
        goals.innerHTML = topScorer.goals;
      } else {
        goals.innerHTML = 0;
      }
      place.appendChild(goals);

      // Assists
      var assists = document.createElement("td");
      if (topScorer.assists) {
        assists.innerHTML = topScorer.assists;
      } else {
        assists.innerHTML = 0;
      }
      place.appendChild(assists);

      // Games played
      var gamesPlayed = document.createElement("td");
      if (topScorer.playedMatches) {
        gamesPlayed.innerHTML = topScorer.playedMatches;
      } else {
        gamesPlayed.innerHTML = 0;
      }
      place.appendChild(gamesPlayed);

      // Add row to table
      places.appendChild(place);
    }

    wrapper.appendChild(places);
    return wrapper;
  },
  renderMatches(wrapper) {
    //Create encapsuling div
    var div = document.createElement("div");
    if (this.config.width !== 0) div.style.width = this.config.width;
    wrapper.appendChild(div);
    wrapper = this.renderTitle(wrapper);

    var matches = document.createElement("table");
    matches.className = "xsmall";

    var activeLeagueMatches = this.matches[this.currentLeague];
    var activeLeagueLogos = this.logos[this.currentLeague];
    var lastDate = 0;

    // Create a row for every match, possible a time row as well
    for (var i = 0; i < activeLeagueMatches.length; i++) {
      if (activeLeagueMatches[i]) {
        const game = activeLeagueMatches[i];
        // Calculate local time
        var date = this.getFormattedDate(new Date(game.utcDate));
        var clock = moment(game.utcDate, "YYYY-MM-DDThh:mm:ssZ").format(
          "HH:mm"
        );

        // Build a time row if time is new
        if (date !== lastDate) {
          var time_row = document.createElement("tr");
          var timeCell = document.createElement("td");

          timeCell.innerHTML = date;
          timeCell.className = "MMM-SoccerLiveScore-time";
          timeCell.setAttribute("width", "330px");
          timeCell.setAttribute("colspan", "7");
          time_row.appendChild(timeCell);
          matches.appendChild(time_row);

          // Store lastTime, so we don't build the same timerow again
          lastDate = date;
        }

        // Create row
        var match = document.createElement("tr");

        //Shows hometeam name

        var team1_name = document.createElement("td");
        team1_name.setAttribute("align", "left");
        team1_name.setAttribute("width", "130px");
        team1_name.innerHTML = game.homeTeam.name;
        match.appendChild(team1_name);

        //Shows hometeam logo
        if (activeLeagueLogos) {
          var team1_logo_cell = document.createElement("td");
          team1_logo_cell.setAttribute("width", "20px");
          var team1_logo_image = document.createElement("img");
          team1_logo_image.className = "MMM-SoccerLiveScore-team1_logo";
          //team ids are hidden in links
          var idString = game.homeTeam.id;
          team1_logo_image.src = activeLeagueLogos[idString];
          team1_logo_image.width = 20;
          team1_logo_image.height = 20;
          team1_logo_cell.appendChild(team1_logo_image);
          match.appendChild(team1_logo_cell);
        }
        var gameTimeCell = document.createElement("td");
        gameTimeCell.style.textAlign = "center";
        gameTimeCell.style.paddingLeft = "4px";
        gameTimeCell.style.paddingRight = "4px";

        switch (game.status) {
          case "FINISHED":
            if (game.score.extraTime?.home) {
              gameTimeCell.innerHTML =
                game.score.extraTime.home +
                " : " +
                game.score.extraTime.away +
                " ";
              var minNode = document.createElement("strong");
              minNode.innerText = "(ET)";
              gameTimeCell.appendChild(minNode);
            } else {
              gameTimeCell.innerHTML =
                game.score.fullTime.home + " : " + game.score.fullTime.away;
            }
            break;
          case "IN_PLAY":
            if (game.score.extraTime?.home) {
              gameTimeCell.innerHTML =
                game.score.extraTime.home +
                " : " +
                game.score.extraTime.away +
                " ";
            } else if (game.score.fullTime.home) {
              gameTimeCell.innerHTML =
                game.score.fullTime.home +
                " : " +
                game.score.fullTime.away +
                " ";
            }

            var minNode = document.createElement("strong");
            minNode.innerText = "(LIVE)";
            gameTimeCell.appendChild(minNode);
            break;
          case "PAUSED":
            gameTimeCell.innerHTML =
              game.score.halfTime.home + " : " + game.score.halfTime.away + " ";
            var htNode = document.createElement("strong");
            htNode.innerText = "(HT)";
            gameTimeCell.appendChild(htNode);
            break;
          default:
            gameTimeCell.innerHTML = " " + clock + " ";
            break;
        }
        match.appendChild(gameTimeCell);

        //Shows awayteamlogo
        if (activeLeagueLogos !== undefined) {
          var team2_logo_cell = document.createElement("td");
          team2_logo_cell.setAttribute("width", "20px");
          var team2_logo_image = document.createElement("img");
          team2_logo_image.className = "MMM-SoccerLiveScore-team2_logo";
          //team ids are hidden in links
          var idString = activeLeagueMatches[i].awayTeam.id;
          team2_logo_image.src = activeLeagueLogos[idString];
          team2_logo_image.width = 20;
          team2_logo_image.height = 20;
          team2_logo_cell.appendChild(team2_logo_image);
          match.appendChild(team2_logo_cell);
        }

        //Shows awayteamname

        var team2_name = document.createElement("td");
        team2_name.setAttribute("align", "right");
        team2_name.setAttribute("width", "130px");
        team2_name.innerHTML = activeLeagueMatches[i].awayTeam.name;
        match.appendChild(team2_name);

        matches.appendChild(match);
      }
    }

    wrapper.appendChild(matches);
    return wrapper;
  },

  // Receives (constant) updates from background processes from node_helper
  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "LOGO" + this.identifier:
        this.logos[payload.leagueId] = payload.table;
        break;
      case "MATCHES" + this.identifier:
        this.now = this.getNow();
        this.matches[payload.leagueId] = payload.matches;
        break;
      case "LEAGUES" + this.identifier:
        // this.crawledIdsList.push(payload.id);
        this.leagueNames[payload.id] = payload.name;
        this.leagueLogos[payload.id] = payload.logo;
        break;
      case "TABLE" + this.identifier:
        this.now = this.getNow();
        this.tables[payload.leagueId] = payload.table;
        break;
      case "TOP_SCORERS" + this.identifier:
        this.now = this.getNow();
        this.topScorers[payload.leagueId] = payload.topScorers;
        break;
    }
  },
});
