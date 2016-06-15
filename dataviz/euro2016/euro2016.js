/**
 * Nation
 */
function Nation(name, code, flag) {
    this.name = name;
    this.code = code;
    this.flag = flag;
}

/**
 * A team
 */
function Team(nation) {
    this.nation = nation;
    this.standing = 1;
    this.code = "";
    this.group = null;

    this.stas = {
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0
    };

    this.played = 0;
    this.matches = [];
}

Team.prototype.addMatch = function (match) {

    var me = 0;
    var other = 0;
    var isHome = this.code == match.team1.code;

    // If the results have two elements (which means the match happened)
    if (match.results.length) {
        if (isHome) {
            // home
            me = match.results[0];
            other = match.results[1];
        } else {
            // away
            me = match.results[1];
            other = match.results[0];
        }

        if (me > other) {
            this.stas.won++;
            this.stas.points += 3;
        } else if (me == other) {
            this.stas.drawn++;
            this.stas.points += 1;
        } else {
            this.stas.lost++;
        }

        this.played++;
    }

    this.matches.push({
        against: isHome ? match.team2 : match.team1,
        match: match,
        isHome: isHome,
        results: match.results.length ? [me, other] : null
    });
};

/**
 * Group
 */
function Group(name) {
    this.name = name;
    this.teams = [];
}

Group.prototype.addTeam = function (team) {
    this.teams.push(team);
    team.code = this.name + this.teams.length;
    team.group = this;
};

Group.prototype.qualify = function (euro) {
    var standings = [0, 1, 2, 3];

    var sortingStandings = euro.qualifyByPoints(standings, this.teams);
    var _this = this;

    var sortingStandings2 = [];
    var tempArray;

    sortingStandings.forEach(function (ts) {
        if (ts.length === 1) {
            sortingStandings2.push(ts);
        } else {
            tempArray = euro.qualifySamePointsTeams(ts.map(function (t) {
                return {
                    teamIndex: t.teamIndex,
                    team: _this.teams[t.teamIndex],
                    points: t.points
                };
            }));
            tempArray.forEach(function (t) {
                sortingStandings2.push(t);
            })
        }
    });

};

/**
 * A Match
 *
 */
function Match(number, team1, team2, results, city, time) {
    this.number = number;
    this.team1 = team1;
    this.team2 = team2;
    this.results = results;
    this.city = city;
    this.time = time;
}

/**
 * Championship
 */
function Euro() {
    this.groups = [];
    this.matches = [];
    this.playedMatches = [];
}

/**
 * Create groups, teams, and matches
 *
 * @see http://www.uefa.com/MultimediaFiles/Download/Regulations/uefaorg/Regulations/02/03/92/81/2039281_DOWNLOAD.pdf
 */
Euro.prototype.schedule = function (json) {
    var i, j, len, len2;
    var group;
    var match;

    // Get teams and groups data
    for (i = 0; i < Euro.NUM_GROUPS; i++) {
        group = new Group(json.groups[i].group);
        for (j = 0; j < Euro.NUM_TEAMS_IN_GROUP; j++) {
            group.addTeam(new Team(new Nation(json.groups[i].teams[j].name, json.groups[i].teams[j].code)));
        }

        this.groups.push(group);
    }

    // Schedule matches
    for (i = 0, len = json.matches.length; i < len; i++) {
        this.addMatch(json.matches[i]);
    }

    // sort each group
    for (i = 0; i < Euro.NUM_GROUPS; i++) {
        this.groups[i].qualify(this);
    }
};

Euro.prototype.addMatch = function (json) {
    var team1 = this.findTeam(json.team1);
    var team2 = this.findTeam(json.team2);
    var results = [];
    if (json.results !== "-") {
        results = json.results.split("-").map(function (number) {
            return parseInt(number);
        });
    }

    var match = new Match(json.number, team1, team2, results, json.city, json.time);
    this.matches.push(match);

    team1.addMatch(match);
    team2.addMatch(match);

    return match;
};

Euro.prototype.findTeam = function (teamCode) {
    var groupIndex = teamCode.charCodeAt(0) - 65; // ord(A) = 65
    var teamIndex = parseInt(teamCode.charAt(1));
    return this.groups[groupIndex].teams[teamIndex - 1];
};

// 1: team1 > team2; 0: team1 = team2; -1: team1 < team2
// http://www.uefa.com/MultimediaFiles/Download/Regulations/uefaorg/Regulations/02/03/92/81/2039281_DOWNLOAD.pdf
Euro.prototype.compareTeams = function (team1, team2) {
    var i, len;
    var delta;
    // 13.01.a. points
    if (team1.stas.points > team2.stas.points) {
        return 1;
    } else if (team1.stas.points < team2.stas.points) {
        return -1;
    } else {
        // 13.01.b. superior goal difference from the group matches played among the teams in question
        delta = 0;
        for (i = 0, len = team1.matches.length; i < len; i++) {
            if (team1.matches[i].team2.code === team2.code) {
                delta = team1.matches[i].isHome ? (team1.matches[i].results[0] - team1.matches[i].results[1]) : (team1.matches[i].results[1] - team1.matches[i].results[0]);
                break;
            }
        }
        if (delta > 0) {
            return 1;
        } else if (delta < 0) {
            return -1;
        } else {
            // 13.01.c. 
        }
    }
};

Euro.prototype.qualifyByPoints = function (standings, teamsArray) {
    var i, len;
    var sortingArray = standings.map(function (e) {
        return {teamIndex: e, points: teamsArray[e].stas.points};
    }).sort(function (a, b) {
        // team with greater points comes first
        return b.points - a.points
    });

    var finalArray = [];
    for (i = 0, len = sortingArray.length; i < len; i++) {
        if (finalArray.length && finalArray[finalArray.length - 1][0].points == sortingArray[i].points) {
            // this team has the same points as the previous team
            finalArray[finalArray.length - 1].push(sortingArray[i]);
        } else {
            // this team has a smaller points than the previous
            finalArray.push([sortingArray[i]])
        }
    }

    return finalArray;
}

/**
 * See http://www.uefa.com/MultimediaFiles/Download/Regulations/uefaorg/Regulations/02/03/92/81/2039281_DOWNLOAD.pdf
 *
 * @param qualifyingTeams
 */
Euro.prototype.qualifySamePointsTeams = function (qualifyingTeams) {
    var matches = [];
    var otherTeams;
    var i, len;

    // find all matches between teams in question
    for (i = 0, len = qualifyingTeams.length; i < len - 1; i++) {
        otherTeams = qualifyingTeams.slice(i + 1).map(function (t) {
            return t.team.code;
        });
        qualifyingTeams[i].team.matches.forEach(function (m) {
            // if this match is between two of qualifying team and this match has the results
            if (otherTeams.indexOf(m.against.code) > -1 && !!m.results) {
                matches.push(m.match);
            }
        });
    }


    qualifyingTeams.forEach(function (t) {
        t.team.tempStats = {points: 0, goalDiff: 0, goalsScored: 0, goalsScoredAway: 0};
    })

    // calculate the points, goal difference, goals scored and goals scored aways for each team in these matches
    // 13.01.a,b,c,d
    matches.forEach(function (m) {
        var goalDiff = m.results[0] - m.results[1];

        // update team1 stats
        m.team1.tempStats.points += (goalDiff > 0 ? 3 : (goalDiff === 0 ? 1 : 0))
        m.team1.tempStats.goalDiff += goalDiff;
        m.team1.tempStats.goalsScored += m.results[0];

        // update team2 status;
        m.team2.tempStats.points += (goalDiff < 0 ? 3 : (goalDiff === 0 ? 1 : 0))
        m.team2.tempStats.goalDiff += -goalDiff;
        m.team2.tempStats.goalsScored += m.results[1];
        m.team2.tempStats.goalsScoredAway += m.results[1];
    });

    var sortingArray = qualifyingTeams.sort(function (t1, t2) {
        if (t1.team.tempStats.points === t2.team.tempStats.points) {
            if (t1.team.tempStats.goalDiff === t2.team.tempStats.goalDiff) {
                if (t1.team.tempStats.goalsScored === t2.team.tempStats.goalsScored) {
                    if (t1.team.tempStats.goalsScoredAway === t2.team.tempStats.goalsScoredAway) {
                        return 0;
                    } else {
                        // 13.01.d higher goal scored away
                        return t2.team.tempStats.goalsScoredAway - t1.team.tempStats.goalsScoredAway;
                    }
                } else {
                    // 13.01.c higher goal scored
                    return t2.team.tempStats.goalsScored - t1.team.tempStats.goalsScored;
                }
            } else {
                // 13.01.b higher goal difference
                return t2.team.tempStats.goalDiff - t1.team.tempStats.goalDiff;
            }
        } else {
            // 13.01.a higher point
            return t2.team.tempStats.points - t1.team.tempStats.points;
        }
    });

    var finalArray = [];
    for (i = 0, len = sortingArray.length; i < len; i++) {
        if (finalArray.length && JSON.stringify(finalArray[finalArray.length - 1][0].team.tempStats) == JSON.stringify(sortingArray[i].team.tempStats)) {
            // this team has the same stats as the previous team
            finalArray[finalArray.length - 1].push(sortingArray[i]);
        } else {
            // this team has a smaller points than the previous
            finalArray.push([sortingArray[i]])
        }
    }

    console.log(finalArray);

    return finalArray;
}

Euro.NUM_GROUPS = 6;
Euro.NUM_TEAMS_IN_GROUP = 4;