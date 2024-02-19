var NodeHelper = require("node_helper");
var moment = require("moment");
// const fetch = require('node-fetch');
let fetch;

import("node-fetch")
	.then((module) => {
		fetch = module.default;
		// Any other code that depends on fetch should be inside this block or appropriately handled to ensure fetch is defined before use
	})
	.catch((err) => console.error("Failed to load node-fetch:", err));

module.exports = NodeHelper.create({
	// Gets automatically called when the module starts
	start: function () {
		console.log("MMM-All-Football Started...");
	},

	// Starts all data gathering background processes
	startGatherData: function (leagues, showLogos, showTables, apiKey, id, showUnavailable) {
		// First, gathers all available league ids, gracefully handles if a league doesn't exist
		var self = this;

		//Calculate maximum polling speed
		// var refreshTime = 60000 * leagues.length;
		var refreshTime = 60000;
		console.log("MMM-All-Football is refreshing every: " + refreshTime + "ms.");

		//Check whether unavailable leagues should be shown.
		if (showUnavailable) {
			for (var j = 0; j < leagues.length; j++) {
				var league = leagues[j];

				var options = {
					method: "GET",
					headers: {
						"X-Auth-Token": apiKey
					}
				};

				// oldUrl = "http://api.football-data.org/v2/competitions/" + league.toString()
				const url = "http://api.football-data.org/v4/competitions/" + league.toString();

				fetch(url, options)
					.then((res) => res.text())
					.then(function (body) {
						var competition = JSON.parse(body);

						// Second, start gathering background processes for available league
						self.getMatches(league, apiKey, refreshTime, id);

						if (showTables) {
							self.getTable(league, apiKey, refreshTime, id);
						}

						if (showLogos) {
							self.getTeamLogos(league, apiKey, id);
						}

						var cap = "";
						if (competition.hasOwnProperty("name")) {
							cap = competition.name;
						}

						// Third, send notification that leagues exist
						self.sendSocketNotification("LEAGUES" + id, {
							name: cap,
							id: league,
							logo: competition.emblem
						});
					});
			}
		} else {
			var options = {
				method: "GET",
				headers: {
					"X-Auth-Token": apiKey
				}
			};

			// Fetch all available leagues
			fetch("http://api.football-data.org/v4/competitions", options)
				.then((res) => res.text())
				.then(function (body) {
					var competitions = JSON.parse(body).competitions;

					for (var i = 0; i < leagues.length; i++) {
						for (var j = 0; j < competitions.length; j++) {
							// Check if current league fits a competition, if it does, the league is available
							if (competitions[j].id === leagues[i]) {
								// Second, start gathering background processes for available league
								self.getMatches(competitions[j].id, apiKey, refreshTime, id);

								if (showTables) {
									self.getTable(competitions[j].id, apiKey, refreshTime, id);
								}

								if (showLogos) {
									self.getTeamLogos(competitions[j].id, apiKey, id);
								}

								// Third, send notification that leagues exist
								self.sendSocketNotification("LEAGUES" + id, {
									name: competitions[j].name,
									id: competitions[j].id
								});

								break;
							}
						}
					}
				})
				.catch(function (e) {
					console.log("MMM-All-Football: Error fetching leagues, is your api key correct?");
					console.log(e);
				});
		}
	},

	// Constantly asks for Matches and sends notifications once they arrive
	getMatches: function (leagueId, apiKey, refreshTime, id) {
		console.log("Getting Matches...");
		var self = this;
		var begin = moment().startOf("isoWeek").format("YYYY-MM-DD");
		var end = moment().endOf("isoWeek").format("YYYY-MM-DD");
		var options = {
			method: "GET",
			headers: {
				"X-Auth-Token": apiKey
			}
		};

		// oldUrl = "http://api.football-data.org/v2/competitions/" + leagueId.toString() + "/matches?dateFrom=" + begin + "&dateTo=" + end;

		const url = "http://api.football-data.org/v4/competitions/" + leagueId.toString() + "/matches?dateFrom=" + begin + "&dateTo=" + end;

		fetch(url, options)
			.then((res) => res.text())
			.then(function (body) {
				var data = JSON.parse(body);
				var fix = data.matches;

				self.sendSocketNotification("MATCHES" + id, {
					leagueId: leagueId,
					matches: fix
				});
			})
			.catch(function (e) {
				console.log("MMM-All-Football: Error with matches from: " + leagueId);
			})
			.finally(function (e) {
				setTimeout(function () {
					self.getMatches(leagueId, apiKey, refreshTime, id);
				}, refreshTime);
			});
	},

	// Constantly asks for LeagueTables and sends notifications once they arrive
	getTable: function (leagueId, apiKey, refreshTime, id) {
		console.log("Getting Table...");
		var self = this;
		var options = {
			method: "GET",
			headers: {
				"X-Auth-Token": apiKey
			}
		};

		// old url ('http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/standings')
		const url = "http://api.football-data.org/v4/competitions/" + leagueId.toString() + "/standings";

		fetch(url, options)
			.then((res) => res.text())
			.then(function (body) {
				var data = JSON.parse(body);

				if (data.hasOwnProperty("standing")) var standings = data.standing;
				else var standings = data.standings;

				var tab = standings[0].table;

				if (!leagueId) console.log("No leagueId found for league: " + leagueId);
				if (!tab) console.log("No table found for league: " + leagueId);

				self.sendSocketNotification("TABLE" + id, {
					leagueId: leagueId,
					table: tab
				});
			})
			.catch(function (e) {
				console.log("MMM-All-Football: Error with table: " + leagueId);
			})
			.finally(function (e) {
				setTimeout(function () {
					self.getTable(leagueId, apiKey, refreshTime, id);
				}, refreshTime);
			});
	},

	// Aquires TeamLogos
	getTeamLogos: function (leagueId, apiKey, id) {
		console.log("Getting Team Logos...");
		var self = this;
		var options = {
			method: "GET",
			headers: {
				"X-Auth-Token": apiKey
			}
		};

		// "http://api.football-data.org/v2/competitions/" + leagueId.toString() + "/teams"
		// const url = `http://api.football-data.org/v4/competitions/${leagueId.toString()}/teams`;
		const url = "http://api.football-data.org/v4/competitions/" + leagueId.toString() + "/teams";

		fetch(url, options)
			.then((res) => res.text())
			.then(function (body) {
				var teamLogos = {};

				var data = JSON.parse(body);

				if (!data.teams) throw body;

				for (var i = 0; i < data.teams.length; i++) {
					// console.log(data.teams[i]);
					try {
						teamLogos[data.teams[i].id] = data.teams[i].crest;
					} catch (e) {
						console.log("Error with logo: " + data.teams[i].id + " - " + data.teams[i].name);
					}
				}

				self.sendSocketNotification("LOGO" + id, { leagueId: leagueId, table: teamLogos });
			})
			.catch(function (e) {
				console.log("MMM-All-Football: Error with logos: " + leagueId);
				console.log("MMM-All-Football: Error loading leaguedata for: " + leagueId.toString());
				console.log(e);
			});
	},

	// Receives startup notification, containing config data
	socketNotificationReceived: function (notification, payload) {
		if (notification === "CONFIG") {
			this.startGatherData(payload.leagues, payload.showLogos, payload.showTables, payload.apiKey, payload.id, payload.showUnavailable);
		}
	}
});
