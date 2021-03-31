const core = require("@actions/core");
const github = require("@actions/github");
const MilestoneSource = require("./milestone-source");
const Reporter = require("./reporter");

async function run() {
  try {
    // Gathering inputs
    const prefix = core.getInput("tag_prefix");
    const releaseVersion = core.getInput("release_version");
    const reporterMode = core.getInput("reporter_mode");
    const owner = github.context.payload.repository.owner.login;
    const repository = github.context.payload.repository.name;
    const token = github.context.payload.token;

    // Create instances
    let client = new MilestoneSource(owner, repository, token);
    let reporter = new Reporter(releaseVersion);

    // Collecting information to produce the report
    let lastVersion = await client
      .getLatestRelease()
      .then((it) => `${prefix}${it}`);
    let newVersion = `${prefix}${releaseVersion}`;
    let startingSHA = await client.getTagSHA(lastVersion);
    let finalSHA = await client.getTagSHA(newVersion);
    let prs = await client.getCommitsBetween(startingSHA, finalSHA);

    // Producing report
    let output = reporter.generate(prs);
    core.setOutput("notes", output);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
