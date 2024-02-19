Module.register("MMM-All-Football", {
	// Default module config
	defaults: {
		leagues: ["PL"],
		showTables: true,
		showNames: true,
		showLogos: true,
		showUnavailable: true,
		displayTime: 60 * 1000,
		width: 0,
		apiKey: ""
	},

	// Gets automatically called when the module starts
	loaded: function (callback) {
		this.finishLoading();
		console.log(this.name + " is loaded!");
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
		this.loadet = false;
		this.logos = {};
		this.matches = {};
		this.leagueNames = {};
		this.leagueLogos = {};
		this.tables = {};
		this.tableViewActive = false;
		this.crawledIdsList = [];
		this.activeId = -1;
		this.now = this.getNow();

		console.log("Started with ids: " + this.config.leagues);

		// Send our current config to node_helper, starting its polling
		this.sendSocketNotification("CONFIG", {
			leagues: this.config.leagues,
			showLogos: this.config.showLogos,
			showTables: this.config.showTables,
			apiKey: this.config.apiKey,
			id: this.identifier,
			displayTime: this.displayTime,
			showUnavailable: this.config.showUnavailable
		});

		// Set the league that should be displayed, starting with the arrays first entry
		this.changeLeague(this, 0);
	},

	// Changes league to the one specified by index, oly uses crawled indices
	changeLeague: function (self, leagueIndex) {
		// If we have not crawled an ID yet, repeat in 1 second
		if (self.crawledIdsList.length === 0) {
			setTimeout(function () {
				self.changeLeague(self, 0);
			}, 1000);
			return;
		}

		// console.log("Switching between leagues: Selecting League number: " + (leagueIndex + 1) + " - League ID: " + self.crawledIdsList)
		self.activeId = self.crawledIdsList[leagueIndex];
		setTimeout(function () {
			self.changeLeague(self, (leagueIndex + 1) % self.crawledIdsList.length);
		}, self.config.displayTime);
	},

	// Returns the View, gets called every updateTime by itself through setTimeout
	getDom: function () {
		// Create the base element
		var self = this;
		var wrapper = document.createElement("div");
		console.log("getDom()");
		//console.log("Updating Football League");

		// return nothing if no data exists
		// console.log("this.activeId: " + this.activeId);
		// console.log("this.matches: " + JSON.stringify(this.matches));
		// console.log("this.matches.length: " + this.matches.length);
		// console.log("this.matches[this.activeId]: " + this.matches[this.activeId]);

		if (this.activeId === -1 || this.matches.length === 0 || this.matches[this.activeId] === undefined) {
			wrapper.innerHTML = "Loading...";

			setTimeout(function () {
				self.updateDom(1000);
			}, 1000);

			console.log("Waiting for Data...");

			return wrapper;
		}

		// console.log("Displaying data of league: " + this.activeId);

		// Add fontawesome to html head, to use their icons
		var link = document.createElement("link");
		link.id = "id2";
		link.rel = "stylesheet";
		link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
		document.head.appendChild(link);

		//Check if table data exists and tables should be shown, if so, return a tableDom, tableViewActive switches between tables and matches
		console.log("Table");
		// console.log(this.tables[this.activeId]);
		// if (this.tableViewActive && this.tables[this.activeId] !== undefined && this.config.showTables) {
		// 	wrapper = renderTable(wrapper);
		// } else {
		// 	wrapper = renderMatches(wrapper);
		// }

		if (this.config.showTables) {
			if (this.tableViewActive && this.tables[this.activeId] !== undefined) {
				wrapper = this.renderTable(wrapper);
			} else {
				wrapper = this.renderMatches(wrapper);
			}
		} else {
			wrapper = this.renderMatches(wrapper);
		}

		setTimeout(function () {
			self.updateDom(1000);
		}, this.config.displayTime / 4);
		return wrapper;
	},

	renderTitle(wrapper) {
		// 			// Create Header
		// 	var title = document.createElement("header");
		// 	title.innerHTML = this.leagueNames[this.activeId] + " - " + this.now;
		// 	title.setAttribute("width", "330px");
		// wrapper.appendChild(title);

		var title = document.createElement("header");
		title.innerHTML = this.leagueNames[this.activeId] + " - " + this.now;
		title.setAttribute("width", "330px");
		wrapper.appendChild(title);
		return wrapper;
	},

	renderTable(wrapper) {
		console.log("Inside render table");
		// console.log("Displaying table of league: " + this.activeId);
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
		if (this.config.showLogos) {
			var logo = document.createElement("th");
			logo.setAttribute("width", "30px");
			labelRow.appendChild(logo);
		} else {
			//Stretch position row so we always have the same width if no logos are selected
			position.setAttribute("width", "60px");
		}

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

		for (var i = 0; i < table.length; i++) {
			var place = document.createElement("tr");

			var number = document.createElement("td");
			number.innerHTML = i + 1;
			place.appendChild(number);

			if (this.config.showLogos) {
				var team_logo_cell = document.createElement("td");
				var team_logo_image = document.createElement("img");

				team_logo_image.className = "MMM-SoccerLiveScore-team_logo";
				team_logo_image.src = table[i].team.crest;
				team_logo_image.width = 20;
				team_logo_image.height = 20;
				team_logo_cell.appendChild(team_logo_image);
				place.appendChild(team_logo_cell);
			}

			if (this.config.showNames) {
				var team_name = document.createElement("td");
				team_name.setAttribute("align", "left");
				team_name.innerHTML = table[i].team.name;
				place.appendChild(team_name);
			}

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
		// }

		// Change next view to matches
		this.tableViewActive = false;
		wrapper.appendChild(places);
		return wrapper;
	},
	renderMatches(wrapper) {
		// // console.log("Displaying matches of league: " + this.activeId);
		// // Create Matches View
		var matches = document.createElement("table");
		matches.className = "xsmall";
		var title = document.createElement("header");

		// // var team_logo_cell = document.createElement("td");
		// var team_logo_image = document.createElement("img");
		// var logo = this.leagueLogos[this.activeId];
		// console.log("logo");
		// console.log(logo);

		// team_logo_image.className = "MMM-SoccerLiveScore-team_logo";
		// team_logo_image.src = logo;
		// // team_logo_image.width = 30;
		// team_logo_image.height = 40;
		// // team_logo_image.style.maxWidth = "20";
		// // team_logo_image.width = "auto";
		// team_logo_image.style.maxWidth = "100%";
		// team_logo_image.style.padding = "2px";
		// team_logo_image.style.backgroundColor = "white";
		// // team_logo_image.style.float = "left";
		// // title.appendChild(team_logo_image);

		// // title.innerHTML = this.leagueNames[this.activeId] + " - " + this.now;

		// var titleText = document.createElement("span");
		// titleText.innerHTML = this.leagueNames[this.activeId] + " - " + this.now;
		// title.setAttribute("width", "330px");
		// title.appendChild(team_logo_image);
		// title.appendChild(titleText);
		// wrapper.appendChild(title);

		title.innerHTML = this.leagueNames[this.activeId] + " - " + this.now;
		wrapper.appendChild(title);

		var activeLeagueMatches = this.matches[this.activeId];
		var activeLeagueLogos = this.logos[this.activeId];
		var lastTime = 0;

		// Create a row for every match, possible a time row as well
		for (var i = 0; i < activeLeagueMatches.length; i++) {
			if (activeLeagueMatches[i] !== undefined) {
				// Calculate local time
				var time = moment(activeLeagueMatches[i].utcDate, "YYYY-MM-DDThh:mm:ssZ").format("DD.MM.YY - HH:mm");

				// Build a time row if time is new
				if (time !== lastTime) {
					var time_row = document.createElement("tr");
					var timeCell = document.createElement("td");

					timeCell.innerHTML = time;
					timeCell.className = "MMM-SoccerLiveScore-time";
					timeCell.setAttribute("width", "330px");
					timeCell.setAttribute("colspan", "7");
					time_row.appendChild(timeCell);
					matches.appendChild(time_row);

					// Store lastTime, so we don't build the same timerow again
					lastTime = time;
				}

				// Create row
				var match = document.createElement("tr");

				//Shows hometeam name
				if (this.config.showNames) {
					var team1_name = document.createElement("td");
					team1_name.setAttribute("align", "left");
					team1_name.setAttribute("width", "130px");
					team1_name.innerHTML = activeLeagueMatches[i].homeTeam.name;
					match.appendChild(team1_name);
				}

				//Shows hometeam logo
				if (this.config.showLogos && activeLeagueLogos !== undefined) {
					var team1_logo_cell = document.createElement("td");
					team1_logo_cell.setAttribute("width", "20px");
					var team1_logo_image = document.createElement("img");
					team1_logo_image.className = "MMM-SoccerLiveScore-team1_logo";
					//team ids are hidden in links
					var idString = activeLeagueMatches[i].homeTeam.id;
					team1_logo_image.src = activeLeagueLogos[idString];
					team1_logo_image.width = 20;
					team1_logo_image.height = 20;
					team1_logo_cell.appendChild(team1_logo_image);
					match.appendChild(team1_logo_cell);
				}

				console.log("activeLeagueMatches[i]");
				console.log(activeLeagueMatches[i]);

				// Shows Scores
				// var team1_score = document.createElement("td");
				// team1_score.setAttribute("width", "15px");
				// team1_score.setAttribute("align", "center");
				// team1_score.innerHTML = activeLeagueMatches[i].score.fullTime.homeTeam;
				// var collon = document.createElement("td");
				// collon.className = "MMM-SoccerLiveScore-divider";
				// collon.innerHTML = ":";
				// collon.setAttribute("width", "10px");
				// var team2_score = document.createElement("td");
				// team2_score.setAttribute("width", "15px");
				// team2_score.setAttribute("align", "center");
				// team2_score.innerHTML = activeLeagueMatches[i].score.fullTime.awayTeam;
				// match.appendChild(team1_score);
				// match.appendChild(collon);
				// match.appendChild(team2_score);

				// Turns numbers red if game is underway
				// if (activeLeagueMatches[i].status === "IN_PLAY") {
				// 	team1_score.classList.add("MMM-SoccerLiveScore-red");
				// 	collon.classList.add("MMM-SoccerLiveScore-red");
				// 	team2_score.classList.add("MMM-SoccerLiveScore-red");
				// }
				const game = activeLeagueMatches[i];
				var gameTimeCell = document.createElement("td");
				gameTimeCell.style.textAlign = "center";

				switch (game.status) {
					case "FINISHED":
						if (game.score.extraTime.homeTeam) {
							gameTimeCell.innerHTML = game.score.extraTime.homeTeam + " : " + game.score.extraTime.awayTeam + " ";
							var minNode = document.createElement("strong");
							minNode.innerText = "(ET)";
							gameTimeCell.appendChild(minNode);
						} else {
							gameTimeCell.innerHTML = game.score.fullTime.homeTeam + " : " + game.score.fullTime.awayTeam;
						}
						break;
					case "IN_PLAY":
						if (game.score.extraTime.homeTeam) {
							gameTimeCell.innerHTML = game.score.extraTime.homeTeam + " : " + game.score.extraTime.awayTeam + " ";
						} else if (game.score.fullTime.homeTeam) {
							gameTimeCell.innerHTML = game.score.fullTime.homeTeam + " : " + game.score.fullTime.awayTeam + " ";
						}

						var minNode = document.createElement("strong");
						minNode.innerText = "(LIVE)";
						gameTimeCell.appendChild(minNode);
						break;
					case "PAUSED":
						gameTimeCell.innerHTML = game.score.halfTime.homeTeam + " : " + game.score.halfTime.awayTeam + " ";
						var htNode = document.createElement("strong");
						htNode.innerText = "(HT)";
						gameTimeCell.appendChild(htNode);
						break;
					default:
						gameTimeCell.innerHTML = " vs ";
						break;
				}
				match.appendChild(gameTimeCell);

				//Shows awayteamlogo
				if (this.config.showLogos && activeLeagueLogos !== undefined) {
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
				if (this.config.showNames) {
					var team2_name = document.createElement("td");
					team2_name.setAttribute("align", "right");
					team2_name.setAttribute("width", "130px");
					team2_name.innerHTML = activeLeagueMatches[i].awayTeam.name;
					match.appendChild(team2_name);
				}

				matches.appendChild(match);
			}
		}

		// Change next view to table if available
		if (this.tables[this.activeId] !== undefined && this.config.showTables) this.tableViewActive = true;

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
				// console.log("MATCHES" + this.identifier + " received");
				this.matches[payload.leagueId] = payload.matches;
				break;
			case "LEAGUES" + this.identifier:
				this.crawledIdsList.push(payload.id);
				this.leagueNames[payload.id] = payload.name;
				this.leagueLogos[payload.id] = payload.logo;
				break;
			case "TABLE" + this.identifier:
				this.now = this.getNow();
				this.tables[payload.leagueId] = payload.table;
				break;
		}
	}
});
