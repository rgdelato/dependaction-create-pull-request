const core = require("@actions/core");
const { Octokit } = require("@octokit/core");

const token = process.argv[2];
const matrix = JSON.parse(JSON.parse(process.argv[3]));

const octokit = new Octokit({ auth: token });

// TODO: This currently only works on PRs where all packages being updated are
//       hosted in the same GitHub repo.

(async function () {
  let body = "";

  const versionsKeyedByURL = getVersionsKeyedByURL(matrix.packages);
  const hasOnlyOneURL = Object.keys(versionsKeyedByURL).length <= 1;

  if (hasOnlyOneURL) {
    for (const [url, version] of Object.entries(versionsKeyedByURL)) {
      const owner = url.split("/").at(-2);
      const repo = url.split("/").at(-1);

      try {
        const releaseResponse = await getReleaseByVersion(owner, repo, version);
        const tag = releaseResponse?.tag_name;
        let changelogResponse = null;

        if (tag) {
          changelogResponse = await getRootChangelog(owner, repo, tag);
        }

        body += await listOfPackages(matrix.packages, owner, repo, tag);

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

        if (changelogResponse?.html_url) {
          body += `\n\nChangelog: <em><a href="${changelogResponse.html_url}"><code>${owner}/${repo}</code>'s root CHANGELOG.md</a></em>`;
        }
      } catch (e) {
        console.error(e?.response || e);
      }
    }
  }

  core.setOutput("body", body);
})();

function getVersionsKeyedByURL(packages) {
  const packagesWithoutTypes = packages.filter(
    ({ name }) => !name.startsWith("@types/")
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

async function listOfPackages(packages, owner, repo, tag) {
  let text = "";
  let rootHasPackagesDirectory = false;

  if (tag) {
    const rootDirectories = await getRootDirectories(owner, repo, tag);

    if (rootDirectories.includes("packages")) {
      rootHasPackagesDirectory = true;
    }
  }

  for (const { name, currentVersion, latestVersion, url } of packages) {
    if (packages.length > 1) {
      text += "- ";
    }

    if (url) {
      text += `Bumps [${name}](${url}) from ${currentVersion} to ${latestVersion}`;
    } else {
      text += `Bumps ${name} from ${currentVersion} to ${latestVersion}`;
    }

    // TODO: Maybe use Git trees to search for "[packageName]/CHANGELOG.md" in
    //       other nested folders that aren't just "packages"
    //       ...or actually check subdirectories for package.json names... o.o
    if (rootHasPackagesDirectory && !name.startsWith("@types/")) {
      const packageChangelog = await getPackageChangelog(
        owner,
        repo,
        name.split("/").at(-1),
        tag
      );

      if (packageChangelog?.html_url) {
        text += ` | [CHANGELOG.md](${packageChangelog.html_url})`;
      }
    }

    text += "\n";
  }

  return text;
}

async function getPackageChangelog(owner, repo, packageName, tag) {
  const possiblePaths = [`packages/${packageName}/CHANGELOG.md`];

  for (const path of possiblePaths) {
    const response = await getFileByPath(owner, repo, path, tag);

    if (response?.status === 200) {
      return response?.data;
    }
  }
}

async function getRootDirectories(owner, repo, tag) {
  try {
    const tree_sha = await getTreeSHAByTag(owner, repo, tag);

    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      {
        owner,
        repo,
        tree_sha,
      }
    );

    if (response?.status === 200) {
      const rootDirectories = response?.data.tree
        .filter(({ path, type }) => type === "tree" && !path.startsWith("."))
        .map(({ path }) => path);

      rootDirectories.sort((a, b) => {
        if (a === "packages") {
          return -1;
        } else if (b === "packages") {
          return 1;
        } else {
          return 0;
        }
      });

      return rootDirectories;
    }
  } catch (e) {
    return e?.response;
  }
}

async function getTreeSHAByTag(owner, repo, ref) {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}",
      {
        owner,
        repo,
        ref,
        mediaType: {
          format: "sha",
        },
      }
    );

    if (response?.status === 200) {
      return response?.data;
    }
  } catch (e) {
    return e?.response;
  }
}
