const core = require("@actions/core");
const { Octokit } = require("@octokit/core");

const token = process.argv[2];
const matrix = JSON.parse(JSON.parse(process.argv[3]));

const octokit = new Octokit({ auth: token });

// TODO: This currently only works on PRs where all packages are sourced from
//       the same GitHub repo

(async function () {
  let body = "";

  const versionsKeyedByURL = getVersionsKeyedByURL(matrix.packages);
  const hasOnlyOneURL = Object.keys(versionsKeyedByURL).length <= 1;

  body += listOfPackages(matrix.packages);

  if (hasOnlyOneURL) {
    for (const [url, version] of Object.entries(versionsKeyedByURL)) {
      const owner = url.split("/").at(-2);
      const repo = url.split("/").at(-1);

      try {
        const releaseResponse = await getReleaseByVersion(owner, repo, version);

        if (releaseResponse?.body) {
          body += `\n\n<details>
<summary>Latest release notes</summary>
<p><em>Sourced from <a href="${releaseResponse.html_url}"><code>${owner}/${repo}</code>'s releases</a>.</em></p>
<blockquote>\n\n`;
          if (releaseResponse?.name || releaseResponse?.tag_name) {
            body += `# ${releaseResponse?.name || releaseResponse?.tag_name}\n`;
          }

          body += releaseResponse.body;
          body += `\n\n</blockquote>
  </details>`;
        }

        const tag = releaseResponse?.tag_name;

        if (tag) {
          const changelogResponse = await getRootChangelog(owner, repo, tag);
          body += `\n\n<a href="${changelogResponse.html_url}"><code>${owner}/${repo}</code>'s CHANGELOG.md</a>`;
        }
      } catch (e) {
        console.error(e?.response);
      }
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

async function getRootChangelog(owner, repo, tag) {
  const possiblePaths = [`CHANGELOG.md`];

  for (const path of possiblePaths) {
    const response = await getFileByPath(owner, repo, path, tag);

    if (response?.status === 200) {
      return response?.data;
    }
  }
}

async function getFileByPath(owner, repo, path, ref = null) {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        ref,
      }
    );

    return response;
  } catch (e) {
    return e?.response;
  }
}
