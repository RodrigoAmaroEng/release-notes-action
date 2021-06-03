const { graphql } = require("@octokit/graphql");
const ReleaseItem = require("./release-item");
Array.prototype.distinct = function () {
  return this.filter((it, i) => this.indexOf(it) === i);
};

Array.prototype.notNull = function () {
  return this.filter((it) => it);
};

const query_LastReleaseVersion = `
releases(last: 1) {
  nodes {
    name
  }
}
`;

const query_LastReleaseCommitTimeStamp = function (version) {
  return `
object(expression:"${version}") {
  ... on Commit {
    committedDate
  }
}`;
};

const query_PullsBetween = function (startDate, finishDate, releaseTag) {
  return `
  changes: object(expression: "${releaseTag}") {
    ... on Commit {
      history(since: "${startDate}", until: "${finishDate}") {
        edges {
          node {
            associatedPullRequests(first:50) {
              nodes {
                title
              }
            }
          }
        }
      }
    }
  }`;
};

module.exports = class MilestoneSource {
  constructor(org, repo, token) {
    this.owner = org;
    this.repo = repo;
    this.client = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
  }

  buildQuery(query) {
    return `
    {
      repository(owner: "${this.owner}", name: "${this.repo}") {
        ${query}
      }
    }`;
  }

  async getLatestRelease() {
    const result = await this.client(this.buildQuery(query_LastReleaseVersion));
    return result.repository.releases.nodes[0].name;
  }

  async getTagTimestamp(version) {
    const result = await this.client(
      this.buildQuery(query_LastReleaseCommitTimeStamp(version))
    );
    return result.repository.object.committedDate;
  }

  async getPullsSinceLastRelease(startDate, finishDate, releaseTag) {
    const result = await this.client(
      this.buildQuery(query_PullsBetween(startDate, finishDate, releaseTag))
    );
    if (!result.repository.changes) return [];
    return result.repository.changes.history.edges
      .flatMap((edge) =>
        edge.node.associatedPullRequests.nodes.map((node) => node.title)
      )
      .distinct()
      .map((item) => {
        try {
          return new ReleaseItem(item);
        } catch (ex) {
          console.log(`Could not parse ${item}: ${ex}`);
          return null;
        }
      })
      .notNull();
  }
};
