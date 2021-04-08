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
    const taskServiceURL = core.getInput("task_service");
    const token = core.getInput("token") || github.context.payload.token;
    const owner = github.context.payload.repository.owner.login;
    const repository = github.context.payload.repository.name;

    // Create instances
    let client = new MilestoneSource(owner, repository, token);
    let reporter = new Reporter(releaseVersion, taskServiceURL);

    // Collecting information to produce the report
    console.log(`Searching for last version on ${owner}/${repository}`);
    let lastVersion = await client
      .getLatestRelease()
      .then((it) => `${prefix}${it}`);
    console.log(`Latest release identified: ${lastVersion}`);
    let newVersion = `${prefix}${releaseVersion}`;
    let startingSHA = await client.getTagSHA(lastVersion);
    console.log(`Latest release commit: ${startingSHA}`);
    let finalSHA = await client.getTagSHA(newVersion);
    console.log(`This release commit: ${finalSHA}`);
    let prs = await client.getCommitsBetween(startingSHA, finalSHA);
    console.log(`${prs.length} PRs collected`);

    // Producing report
    let output = reporter.generate(prs);
    core.setOutput("notes", output);
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
}

run();
