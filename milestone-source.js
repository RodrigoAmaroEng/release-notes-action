const { Octokit } = require("@octokit/rest");
const ReleaseItem = require("./release-item");
Array.prototype.distinct = function () {
  return this.filter((it, i) => this.indexOf(it) === i);
};

module.exports = class MilestoneSource {
  constructor(org, repo, token) {
    this.org = org;
    this.repo = repo;
    this.octoClient = new Octokit({
      auth: token,
      timeZone: "America/Mexico_City",
    });
  }

  getLatestRelease() {
    let setup = {
      owner: this.org,
      repo: this.repo,
      per_page: 1,
    };
    return this.octoClient.repos
      .listReleases(setup)
      .then((it) => it.data.map((i) => i.name)[0]);
  }

  getTagSHA(tag) {
    let setup = {
      owner: this.org,
      repo: this.repo,
    };
    return this.octoClient.git
      .getRef(Object.assign({ ref: "tags/" + tag }, setup))
      .then((it) => {
        if (it.data.object.type == "commit") {
          return it.data.object.sha;
        }
        return this.octoClient.git
          .getTag(Object.assign({ tag_sha: it.data.object.sha }, setup))
          .then((it) => it.data.object.sha);
      });
  }

  getLastReleaseDateFromTag(tag) {
    let setup = {
      owner: this.org,
      repo: this.repo,
    };
    return this.getTagSHA(tag)
      .then((it) =>
        this.octoClient.git.getCommit(Object.assign({ commit_sha: it }, setup))
      )
      .then((it) => it.data.author.date);
  }

  getPullRequestsInThePeriod(startDate, endDate, targetBranch) {
    let query = `repo:${this.org}/${this.repo} is:pr is:merged merged:${startDate}..${endDate} base:${targetBranch}`;
    return this.octoClient.search
      .issuesAndPullRequests({
        q: query,
        per_page: 200,
      })
      .then((it) => it.data.items.map((i) => new ReleaseItem(i.title)));
  }

  getCommitsBetween(startSHA, endSHA) {
    return this.octoClient.repos
      .compareCommits({
        owner: this.org,
        repo: this.repo,
        base: startSHA,
        head: endSHA,
      })
      .then((it) =>
        it.data.commits
          .map((i) => i.commit.message.match(/Merge pull request #(\d+)/))
          .filter((i) => i)
          .map((i) => i[1])
          .distinct()
      )
      .then((it) => {
        return Promise.all(
          it
            .map((i) =>
              this.octoClient.issues
                .get({
                  owner: this.org,
                  repo: this.repo,
                  issue_number: i,
                })
                .then((i) => {
                  try {
                    return new ReleaseItem(i.data.title);
                  } catch (e) {
                    return null;
                  }
                })
            )
            .filter((it) => it)
        );
      });
  }
};
