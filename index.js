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
    const owner = github.context.payload.repository.owner.login;
    const repository = github.context.payload.repository.name;
    const token = github.context.payload.token;

    // Create instances
    let client = new MilestoneSource(owner, repository, token);
    let reporter = new Reporter(releaseVersion, taskServiceURL);

    // Collecting information to produce the report
    let lastVersion = await client.getLatestRelease();
    lastVersion = `${prefix}${lastVersion}`;
    console.log(`Latest release identified: ${lastVersion}`);
    let lastVersionCursor = await client.getTagCursor(lastVersion);
    console.log(`Last version cursor: ${lastVersionCursor}`);
    let newVersion = `${prefix}${releaseVersion}`;
    console.log(`This release is: ${newVersion}`);
    let pulls = await client.getPullsSinceLastRelease(
      lastVersionCursor,
      newVersion
    );
    console.log(
      `${pulls.length} PRs collected between ${lastVersion} and ${newVersion}`
    );

    // Producing report
    let output = reporter.generate(pulls);
    core.setOutput("notes", output);
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
}

run();
