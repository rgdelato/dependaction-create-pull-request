const core = require("@actions/core");
const { Octokit } = require("@octokit/core");

const token = process.argv[2];
const matrix = JSON.parse(JSON.parse(process.argv[3]));

const octokit = new Octokit({ auth: token });

(async function () {
  let body = "";

  body += listOfPackages(matrix.packages);

  const versionsKeyedByURL = getVersionsKeyedByURL(matrix.packages);

  for (const [url, version] of Object.entries(versionsKeyedByURL)) {
    const owner = url.split("/").at(-2);
    const repo = url.split("/").at(-1);

    try {
      const releaseResponse = await getReleaseByVersion(owner, repo, version);

      console.log(releaseResponse);

      if (releaseResponse.body) {
        body += `<details>
<summary>Release notes</summary>
<p><em>Sourced from <a href="${releaseResponse.html_url}"><code>${owner}/${repo}</code>'s releases</a>.</em></p>
<blockquote>

`;
        body += `# ${releaseResponse.name}
`;
        body += releaseResponse.body;
        body += `

</blockquote>
</details>`;
      }
    } catch (e) {
      console.error(e?.response);
    }
  }

  core.setOutput("body", body);
})();

function getVersionsKeyedByURL(packages) {
  const packagesWithoutTypes = packages.filter(
    ({ name }) => !name.startsWith("@types")
  );

  return packagesWithoutTypes.reduce((acc, { latestVersion, url }) => {
    return { ...acc, [url]: latestVersion };
  }, {});
}

async function getReleaseByVersion(owner, repo, version) {
  const possibleTags = [
    `v${version}`,
    version,
    `${repo}@${version}`,
    `${repo}@v${version}`,
  ];

  for (const tag of possibleTags) {
    const response = await getReleaseByTag(owner, repo, tag);

    if (response?.status === 200) {
      return response?.data;
    }
  }
}

async function getReleaseByTag(owner, repo, tag) {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/releases/tags/{tag}",
      {
        owner,
        repo,
        tag,
      }
    );

    return response;
  } catch (e) {
    return e?.response;
  }
}

function listOfPackages(packages) {
  let text = "";

  for (const { name, currentVersion, latestVersion, url } of packages) {
    if (url) {
      text += `${
        packages.length > 1 ? "- " : ""
      }Bumps [${name}](${url}) from ${currentVersion} to ${latestVersion}\n`;
    } else {
      text += `${
        packages.length > 1 ? "- " : ""
      }Bumps ${name} from ${currentVersion} to ${latestVersion}\n`;
    }
  }

  return text;
}
