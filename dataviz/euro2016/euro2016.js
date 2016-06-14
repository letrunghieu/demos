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
    this.position = 1;
    this.code = "";
    this.group = null;

    this.stas = {
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0
    };
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
    }

    this.matches.push({
        match: match,
        isHome: isHome
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

Group.prototype.sort = function (euro) {
    var i;
    for (i = 0; i < Euro.NUM_TEAMS_IN_GROUP; i++) {
        this.teams[i].position = i + 1;
    }
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
        this.groups[i].sort(this);
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

Euro.NUM_GROUPS = 6;
Euro.NUM_TEAMS_IN_GROUP = 4;