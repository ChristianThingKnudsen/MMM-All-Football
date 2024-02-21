var NodeHelper = require("node_helper");
var moment = require("moment");
let fetch;

import("node-fetch")
  .then((module) => {
    fetch = module.default;
  })
  .catch((err) => console.error("Failed to load node-fetch:", err));

module.exports = NodeHelper.create({
  // Gets automatically called when the module starts
  start: function () {
    console.log("MMM-All-Football Started...");
  },

  // Starts all data gathering background processes
  startGatherData: function (leagues, showTables, showTopScorers, apiKey, id) {
    // First, gathers all available league ids, gracefully handles if a league doesn't exist
    var self = this;

    //Calculate maximum polling speed
    var refreshTime = 60000 * leagues.length;
    console.log("MMM-All-Football is refreshing every: " + refreshTime + "ms.");

    for (const league of leagues) {
      const options = {
        method: "GET",
        headers: {
          "X-Auth-Token": apiKey,
        },
      };

      const url =
        "http://api.football-data.org/v4/competitions/" + league.toString();

      fetch(url, options)
        .then((res) => res.text())
        .then(function (body) {
          var competition = JSON.parse(body);

          // Second, start gathering background processes for available league
          self.getMatches(league, apiKey, refreshTime, id);

          if (showTables) {
            self.getTable(league, apiKey, refreshTime, id);
          }
          if (showTopScorers) {
            self.getTopScorers(league, apiKey, refreshTime, id);
          }

          self.getTeamLogos(league, apiKey, id);

          var cap = "";
          if (competition.hasOwnProperty("name")) {
            cap = competition.name;
          }

          // Third, send notification that leagues exist
          self.sendSocketNotification("LEAGUES" + id, {
            name: cap,
            id: league,
            logo: competition.emblem,
          });
        });
    }
  },

  // Constantly asks for Matches and sends notifications once they arrive
  getMatches: function (leagueId, apiKey, refreshTime, id) {
    console.log("Getting Matches for " + leagueId + "...");
    var self = this;
    var begin = moment().startOf("isoWeek").format("YYYY-MM-DD");
    var end = moment().endOf("isoWeek").format("YYYY-MM-DD");
    var options = {
      method: "GET",
      headers: {
        "X-Auth-Token": apiKey,
      },
    };

    const url =
      "http://api.football-data.org/v4/competitions/" +
      leagueId.toString() +
      "/matches?dateFrom=" +
      begin +
      "&dateTo=" +
      end;

    fetch(url, options)
      .then((res) => res.text())
      .then(function (body) {
        var data = JSON.parse(body);
        var fix = data.matches;

        self.sendSocketNotification("MATCHES" + id, {
          leagueId: leagueId,
          matches: fix,
        });
      })
      .catch(function (e) {
        console.error("MMM-All-Football: Error with matches from: " + leagueId);
        console.error(e);
      })
      .finally(function (e) {
        setTimeout(function () {
          self.getMatches(leagueId, apiKey, refreshTime, id);
        }, refreshTime);
      });
  },

  // Constantly asks for LeagueTables and sends notifications once they arrive
  getTable: function (leagueId, apiKey, refreshTime, id) {
    console.log("Getting Table for " + leagueId + "...");
    var self = this;
    var options = {
      method: "GET",
      headers: {
        "X-Auth-Token": apiKey,
      },
    };

    const url =
      "http://api.football-data.org/v4/competitions/" +
      leagueId.toString() +
      "/standings";

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
          table: tab,
        });
      })
      .catch(function (e) {
        console.error("MMM-All-Football: Error with table: " + leagueId);
        console.error(e);
      })
      .finally(function (e) {
        setTimeout(function () {
          self.getTable(leagueId, apiKey, refreshTime, id);
        }, refreshTime);
      });
  },
  getTopScorers: function (leagueId, apiKey, refreshTime, id) {
    console.error("Getting Top Scorers for " + leagueId + "...");
    var self = this;
    var options = {
      method: "GET",
      headers: {
        "X-Auth-Token": apiKey,
      },
    };

    const url =
      "http://api.football-data.org/v4/competitions/" +
      leagueId.toString() +
      "/scorers";

    fetch(url, options)
      .then((res) => res.text())
      .then(function (body) {
        var data = JSON.parse(body);
        topScorers = data?.scorers;

        if (!leagueId)
          console.warn("No leagueId found for league: " + leagueId);
        if (!topScorers)
          console.warn("No top scorers found for league: " + leagueId);

        self.sendSocketNotification("TOP_SCORERS" + id, {
          leagueId: leagueId,
          topScorers: topScorers,
        });
      })
      .catch(function (e) {
        console.error("MMM-All-Football: Error with top scorers: " + leagueId);
        console.error(e);
      })
      .finally(function (e) {
        setTimeout(function () {
          self.getTopScorers(leagueId, apiKey, refreshTime, id);
        }, refreshTime);
      });
  },

  // Aquires TeamLogos
  getTeamLogos: function (leagueId, apiKey, id) {
    console.log("Getting Team Logos for Leage: " + leagueId + "...");
    var self = this;
    var options = {
      method: "GET",
      headers: {
        "X-Auth-Token": apiKey,
      },
    };

    const url =
      "http://api.football-data.org/v4/competitions/" +
      leagueId.toString() +
      "/teams";

    fetch(url, options)
      .then((res) => res.text())
      .then(function (body) {
        var teamLogos = {};

        var data = JSON.parse(body);

        if (!data.teams) throw body;

        for (var i = 0; i < data.teams.length; i++) {
          try {
            teamLogos[data.teams[i].id] = data.teams[i].crest;
          } catch (e) {
            console.error(
              "Error with logo: " +
                data.teams[i].id +
                " - " +
                data.teams[i].name
            );
          }
        }

        self.sendSocketNotification("LOGO" + id, {
          leagueId: leagueId,
          table: teamLogos,
        });
      })
      .catch(function (e) {
        console.error("MMM-All-Football: Error with logos: " + leagueId);
        console.error(e);
      });
  },

  // Receives startup notification, containing config data
  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
      this.startGatherData(
        payload.leagues,
        payload.showTables,
        payload.showTopScorers,
        payload.apiKey,
        payload.id
      );
    }
  },
});
