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

    this.points = 0;
}

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
}

/**
 * A Match
 *
 */
function Match(team1, team2, stage) {
    // Home team
    this.team1 = team1;

    // Away team
    this.team2 = team2;

    // Results in 90min, extra times, penalty.
    this.results = [];

    // The winner team
    this.winner = null;

    this.stage = stage;
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
    var group;
    var match;

    // Get teams and groups data
    for (var i = 0; i < Euro.NUM_GROUPS; i++) {
        group = new Group(json.groups[i].group);
        for (var j = 0; j < Euro.NUM_TEAMS_IN_GROUP; j++) {
            group.addTeam(new Team(new Nation(json.groups[i].teams[j].name, json.groups[i].teams[j].code)));
        }

        this.groups.push(group);
    }

    // Schedule matches
    for (var i = 0, len = json.matches.length; i < len; i++) {
        for (var j = 0, len2 = json.matches[i].matches.length; j < len2; j++) {
            match = new Match(json.matches[i].matches[j][0], json.matches[i].matches[j][1], json.matches[i].stage);
            this.matches.push(match);
        }
    }
};

Euro.NUM_GROUPS = 6;
Euro.NUM_TEAMS_IN_GROUP = 4;