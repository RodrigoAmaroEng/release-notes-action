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

const query_LastReleaseCursor = function (version) {
  return `
ref(qualifiedName:"refs/tags/${version}") {
  target {
    ... on Commit {
      history(first:1) {
        edges {
          cursor
        }
      }
    }
  }
}`;
};

const query_PullsBetween = function (lastReleaseCursor, releaseTag) {
  return `
  changes: ref(qualifiedName: "refs/tags/${releaseTag}") {
    target {
      ... on Commit {
        history(after: "${lastReleaseCursor}") {
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

  async getTagCursor(version) {
    const result = await this.client(
      this.buildQuery(query_LastReleaseCursor(version))
    );
    return result.repository.ref.target.history.edges[0].cursor;
  }

  async getPullsSinceLastRelease(lastReleaseCursor, releaseTag) {
    const result = await this.client(
      this.buildQuery(query_PullsBetween(lastReleaseCursor, releaseTag))
    );
    return result.repository.changes.target.history.edges
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
