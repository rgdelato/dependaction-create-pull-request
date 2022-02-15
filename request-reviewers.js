const { Octokit } = require("@octokit/core");

const token = process.argv[2];
const repository = process.env.GITHUB_REPOSITORY;
const [owner, repo] = repository.split("/");
const pull_number = parseInt(process.argv[3], 10);
const reviewers = getStringAsArray(process.argv[4]);
const team_reviewers = getStringAsArray(process.argv[5]);

(async function () {
  const octokit = new Octokit({ auth: token });
  let response;

  try {
    response = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
      {
        owner,
        repo,
        pull_number,
        reviewers,
        team_reviewers,
      }
    );
  } catch (e) {
    console.error(e);
  }

  console.log(JSON.stringify(response?.data, null, 2));
})();

/**
 *
 * @param {*} str
 * @returns
 */
function getStringAsArray(str) {
  if (!str) return [];

  return str
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((x) => x !== "");
}
